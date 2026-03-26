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

/** Read the current state from jspreadsheet and push it into the model */
function syncToModel() {
  const ws = getWs()
  if (!ws) return
  const names = (ws.getHeaders(true) as string[]).map((h) => (h == null ? '' : String(h)))
  const raw = ws.getData() as string[][]
  const values = raw.map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  model.value = { ...model.value, names, values }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!containerRef.value) return

  const { names, values } = model.value
  const data = values.length ? values.map((row) => [...row]) : [Array(names.length).fill('')]

  worksheets = jspreadsheet(containerRef.value, {
    worksheets: [
      {
        data,
        columns: buildColumns(names),
        allowRenameColumn: true,
        columnDrag: true,
      },
    ],
    onchange() {
      syncToModel()
    },
    onchangeheader(_ws, colIndex, newValue) {
      const names = [...model.value.names]
      names[colIndex] = newValue
      model.value = { ...model.value, names }
    },
    onmovecolumn(_ws, oldPos, newPos) {
      const names = [...model.value.names]
      const [moved] = names.splice(oldPos, 1)
      names.splice(newPos, 0, moved)

      const values = model.value.values.map((row) => {
        const r = [...row]
        const [cell] = r.splice(oldPos, 1)
        r.splice(newPos, 0, cell)
        return r
      })

      model.value = { ...model.value, names, values }
    },
    onpaste() {
      syncToModel()
    },
  })
})

onBeforeUnmount(() => {
  if (containerRef.value) {
    jspreadsheet.destroy(containerRef.value as any)
  }
  worksheets = null
})

// ── Watch external model changes ─────────────────────────────────────────────
// Only react when the reference itself changes (i.e. the parent reassigns the
// whole object), not on deep mutations originating from our own syncToModel.
watch(
  () => model.value,
  (next) => {
    const ws = getWs()
    if (!ws) return

    ws.setData(next.values.length ? next.values : [Array(next.names.length).fill('')])

    next.names.forEach((name, i) => {
      ws.setHeader(i, name)
    })
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
