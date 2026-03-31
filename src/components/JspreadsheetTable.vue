<template>
  <div ref="containerRef" class="jspreadsheet-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import jspreadsheet from 'jspreadsheet-ce'
import type { ContextMenuItem, ContextMenuRole, WorksheetInstance, WorksheetOptions } from 'jspreadsheet-ce'
import type { DataSheetJson } from '../types'

const JSS_ZH_CN_DICTIONARY = {
  Menu: '菜单',
  close: '关闭',
  'Insert a new column before': '在左侧插入列',
  'Insert a new column after': '在右侧插入列',
  'Delete selected columns': '删除所选列',
  'Rename this column': '重命名此列',
  'Column name': '列名',
  'Order ascending': '升序排序',
  'Order descending': '降序排序',
  'Insert a new row before': '在上方插入行',
  'Insert a new row after': '在下方插入行',
  'Delete selected rows': '删除所选行',
  Copy: '复制',
  Paste: '粘贴'
} satisfies Record<string, string>

let dictionaryRegistered = false

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
    width: 120
  }))
}

function getWs(): WorksheetInstance | null {
  return worksheets ? worksheets[0] : null
}

function buildWorksheetData({ names, values }: Pick<DataSheetJson, 'names' | 'values'>) {
  return values.length ? values.map((row) => [...row]) : [Array(names.length).fill('')]
}

function ensureChineseDictionary() {
  if (dictionaryRegistered) return
  jspreadsheet.setDictionary(JSS_ZH_CN_DICTIONARY)
  dictionaryRegistered = true
}

function buildContextMenu(
  instance: WorksheetInstance,
  columnIndex: string | number | null,
  _rowIndex: string | number | null,
  _event: PointerEvent,
  items: ContextMenuItem[],
  role: ContextMenuRole
) {
  if (role !== 'header' || columnIndex == null) return items

  const headerIndex = typeof columnIndex === 'number' ? columnIndex : Number(columnIndex)
  if (Number.isNaN(headerIndex)) return items

  const nextItems = [...items]
  const renameItem: ContextMenuItem = {
    title: '重命名此列',
    onclick: () => {
      const currentName = instance.getHeader(headerIndex)
      const nextName = window.prompt('列名', currentName)
      if (nextName == null) return
      instance.setHeader(headerIndex, nextName)
    }
  }

  const deleteColumnsIndex = nextItems.findIndex((item) => item.title === '删除所选列')
  if (deleteColumnsIndex >= 0) {
    nextItems.splice(deleteColumnsIndex + 1, 0, renameItem)
    return nextItems
  }

  return [renameItem, ...nextItems]
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function areMatrixesEqual(left: string[][], right: string[][]) {
  return left.length === right.length && left.every((row, rowIndex) => areStringArraysEqual(row, right[rowIndex] ?? []))
}

function areSheetStatesEqual(
  left: Pick<DataSheetJson, 'names' | 'values'>,
  right: Pick<DataSheetJson, 'names' | 'values'>
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
    about: false,
    allowExport: false,
    contextMenu: buildContextMenu,
    worksheets: [
      {
        data: buildWorksheetData(sheet),
        columns: buildColumns(sheet.names),
        allowComments: false,
        allowRenameColumn: false,
        columnDrag: true,
        columnSorting: false
      }
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
    }
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
  ensureChineseDictionary()
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
  { deep: false }
)
</script>

<style scoped>
.jspreadsheet-wrapper {
  width: 100%;
  overflow: auto;
}

:deep(.jss_contextmenu),
:deep(.jss_contextmenu > div a),
:deep(.jss_contextmenu > div span),
:deep(.jcontextmenu),
:deep(.jcontextmenu > div a),
:deep(.jcontextmenu > div span) {
  font-size: 14px;
}
</style>
