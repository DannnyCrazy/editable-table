<template>
  <div ref="containerRef" class="jspreadsheet-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import jspreadsheet from 'jspreadsheet-ce'
import type { WorksheetInstance, WorksheetOptions } from 'jspreadsheet-ce'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import type { DataSheetJson } from '../types'

// ── Props / Model ────────────────────────────────────────────────────────────
defineProps<{ readonly?: boolean }>()
const model = defineModel<DataSheetJson>({ required: true })

// ── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null)
let worksheets: WorksheetInstance[] | null = null
let applyingModelToSheet = false
let internalModelUpdateCount = 0

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildColumns(names: string[]): WorksheetOptions['columns'] {
  return names.map((name) => ({
    title: name,
    type: 'text' as const,
    width: 120,
  }))
}

function getWs(): WorksheetInstance | null {
  return worksheets ? worksheets[0] : null
}

function buildWorksheetData({ names, values }: Pick<DataSheetJson, 'names' | 'values'>) {
  return values.length ? values.map((row) => [...row]) : [Array(names.length).fill('')]
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function areMatrixesEqual(left: string[][], right: string[][]) {
  return (
    left.length === right.length &&
    left.every((row, rowIndex) => areStringArraysEqual(row, right[rowIndex] ?? []))
  )
}

function areSheetStatesEqual(
  left: Pick<DataSheetJson, 'names' | 'values'>,
  right: Pick<DataSheetJson, 'names' | 'values'>,
) {
  return areStringArraysEqual(left.names, right.names) && areMatrixesEqual(left.values, right.values)
}

function readWorksheetState(): Pick<DataSheetJson, 'names' | 'values'> | null {
  const ws = getWs()
  if (!ws) return null
  const names = (ws.getHeaders(true) as string[]).map((h) => (h == null ? '' : String(h)))
  const raw = ws.getData() as string[][]
  const values = raw.map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  return { names, values }
}

function updateModel(next: DataSheetJson) {
  if (areSheetStatesEqual(model.value, next)) return
  internalModelUpdateCount += 1
  model.value = next
  queueMicrotask(() => {
    internalModelUpdateCount = Math.max(0, internalModelUpdateCount - 1)
  })
}

/** Read the current state from jspreadsheet and push it into the model */
function syncToModel() {
  if (applyingModelToSheet) return
  const sheetState = readWorksheetState()
  if (!sheetState) return
  updateModel({ ...model.value, ...sheetState })
}

function createWorksheet(sheet: DataSheetJson) {
  if (!containerRef.value) return

  worksheets = jspreadsheet(containerRef.value, {
    worksheets: [
      {
        data: buildWorksheetData(sheet),
        columns: buildColumns(sheet.names),
        allowRenameColumn: true,
        columnDrag: true,
      },
    ],
    onchange() {
      syncToModel()
    },
    onchangeheader(_ws, colIndex, newValue) {
      if (applyingModelToSheet) return
      const names = [...model.value.names]
      names[colIndex] = newValue == null ? '' : String(newValue)
      updateModel({ ...model.value, names })
    },
    onmovecolumn(_ws, oldPos, newPos) {
      if (applyingModelToSheet) return
      const names = [...model.value.names]
      const [moved] = names.splice(oldPos, 1)
      names.splice(newPos, 0, moved ?? '')

      const values = model.value.values.map((row) => {
        const reorderedRow = [...row]
        const [cell] = reorderedRow.splice(oldPos, 1)
        reorderedRow.splice(newPos, 0, cell ?? '')
        return reorderedRow
      })

      updateModel({ ...model.value, names, values })
    },
    onpaste() {
      syncToModel()
    },
  })
}

function destroyWorksheet() {
  if (containerRef.value) {
    jspreadsheet.destroy(containerRef.value as any)
  }
  worksheets = null
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!containerRef.value) return
  createWorksheet(model.value)
})

onBeforeUnmount(() => {
  destroyWorksheet()
})

// ── Watch external model changes ─────────────────────────────────────────────
// Only react when the reference itself changes (i.e. the parent reassigns the
// whole object), not on deep mutations originating from our own syncToModel.
watch(
  () => model.value,
  (next) => {
    if (internalModelUpdateCount > 0) return
    const ws = getWs()
    if (!ws) return

    const current = readWorksheetState()
    if (current && areSheetStatesEqual(current, next)) return

    applyingModelToSheet = true
    try {
      if (!current || current.names.length !== next.names.length) {
        destroyWorksheet()
        createWorksheet(next)
        return
      }

      ws.setData(buildWorksheetData(next))

      next.names.forEach((name, i) => {
        if (current.names[i] !== name) {
          ws.setHeader(i, name)
        }
      })
    } finally {
      applyingModelToSheet = false
    }
  },
  { deep: false },
)
</script>

<style scoped>
.jspreadsheet-wrapper {
  width: 100%;
  overflow: auto;
}
</style>
