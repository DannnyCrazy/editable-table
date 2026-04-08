<template>
  <div class="ag-grid-wrapper">
    <ag-grid-vue
      style="width: 100%; height: 380px"
      :theme="theme"
      :columnDefs="columnDefs"
      :rowData="rowData"
      :defaultColDef="defaultColDef"
      :modules="modules"
      :cellSelection="cellSelectionOptions"
      :stopEditingWhenCellsLoseFocus="true"
      :undoRedoCellEditing="true"
      :undoRedoCellEditingLimit="20"
      :suppressMovableColumns="false"
      @cellValueChanged="onCellValueChanged"
      @columnMoved="onColumnMoved"
      @pasteEnd="onDataChanged"
      @fillEnd="onDataChanged"
      @gridReady="onGridReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { AllEnterpriseModule, LicenseManager, themeQuartz } from 'ag-grid-enterprise'
import type { GridApi, ColDef, GridReadyEvent, CellValueChangedEvent, ColumnMovedEvent } from 'ag-grid-community'
import EditableHeaderRenderer from './EditableHeaderRenderer.vue'
import { areRowMatrixesEqual, sanitizeDataSheetRows } from '../normalizeDataSheet'
import type { DataSheetJson } from '../types'

// Suppress watermark by providing an empty key (trial mode for demo purposes)
LicenseManager.setLicenseKey('')

// ── Theme (Theming API — avoids CSS file / API conflict) ─────────────────────
const theme = themeQuartz

// ── Props / Model ────────────────────────────────────────────────────────────
defineProps<{ readonly?: boolean }>()
const model = defineModel<DataSheetJson>({ required: true })

// ── Grid API reference ───────────────────────────────────────────────────────
let gridApi: GridApi | null = null

// ── Modules ──────────────────────────────────────────────────────────────────
const modules = [AllEnterpriseModule]

// ── Cell selection (range + fill handle) ────────────────────────────────────
const cellSelectionOptions = {
  handle: {
    mode: 'fill' as const
  }
}

// ── Column / row data ────────────────────────────────────────────────────────
const columnDefs = ref<ColDef[]>([])
const rowData = ref<Record<string, string>[]>([])

const defaultColDef: ColDef = {
  editable: true,
  resizable: true,
  sortable: false,
  minWidth: 80,
  flex: 1
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildColDefs(names: string[]): ColDef[] {
  return names.map((name, i) => ({
    field: `col_${i}`,
    headerName: name,
    colId: `col_${i}`,
    editable: true,
    resizable: true,
    sortable: false,
    minWidth: 80,
    flex: 1,
    headerComponent: EditableHeaderRenderer,
    headerComponentParams: {
      onRename: (oldName: string, newName: string) => {
        const idx = model.value.columns.indexOf(oldName)
        if (idx === -1) return
        const names = [...model.value.columns]
        names[idx] = newName
        model.value = { ...model.value, columns: names }
        // Refresh column defs to update displayed header name
        columnDefs.value = buildColDefs(names)
      }
    }
  }))
}

function buildRowData(names: string[], values: string[][]): Record<string, string>[] {
  return values.map((row) => Object.fromEntries(names.map((_name, i) => [`col_${i}`, row[i] ?? ''])))
}

function readGridData(): string[][] {
  if (!gridApi) return []
  const rows: string[][] = []
  gridApi.forEachNode((node) => {
    const row = model.value.columns.map((_name, i) => String(node.data?.[`col_${i}`] ?? ''))
    rows.push(row)
  })
  return rows
}

// ── Event handlers ───────────────────────────────────────────────────────────
function onGridReady(event: GridReadyEvent) {
  gridApi = event.api
  refreshGrid()
}

function onCellValueChanged(_event: CellValueChangedEvent) {
  model.value = { ...model.value, rows: readGridData() }
}

function onDataChanged() {
  model.value = { ...model.value, rows: readGridData() }
}

function onColumnMoved(event: ColumnMovedEvent) {
  if (!event.finished || !gridApi) return

  const allCols = gridApi.getAllDisplayedColumns()
  const newColIds = allCols.map((col) => col.getColId())

  // Build permutation: newColIds are "col_0", "col_1", etc. (original indices)
  const permutation = newColIds.map((id) => parseInt(id.replace('col_', ''), 10))

  const oldNames = model.value.columns
  const newNames = permutation.map((idx) => oldNames[idx] ?? '')
  const newValues = model.value.rows.map((row) => permutation.map((idx) => row[idx] ?? ''))

  // Rebuild colDefs to match new order (re-assign col_0..N to display order)
  const rebuildDefs = buildColDefs(newNames)
  columnDefs.value = rebuildDefs

  model.value = { ...model.value, columns: newNames, rows: newValues }
}

// ── Sync model → grid ────────────────────────────────────────────────────────
function refreshGrid() {
  const sanitizedSheet = sanitizeDataSheetRows(model.value)
  if (!areRowMatrixesEqual(sanitizedSheet.rows, model.value.rows)) {
    model.value = sanitizedSheet
    return
  }

  columnDefs.value = buildColDefs(sanitizedSheet.columns)
  rowData.value = buildRowData(sanitizedSheet.columns, sanitizedSheet.rows)
}

watch(
  () => model.value,
  () => {
    refreshGrid()
  },
  { deep: false }
)
</script>

<style scoped>
.ag-grid-wrapper {
  width: 100%;
  overflow: hidden;
}
</style>
