<template>
  <div class="app">
    <header class="app-header">
      <h1>Editable Table – Debug Page</h1>
      <p class="subtitle">
        Two implementations side by side:
        <strong>Jspreadsheet CE v5</strong> (left) and
        <strong>AG Grid Enterprise</strong> (right).
        Both components share the same <code>DataSheetJson</code> model –
        any edit in one is instantly reflected in the other.
      </p>
    </header>

    <section class="controls">
      <button @click="resetData">↺ Reset data</button>
      <button @click="addRow">＋ Add row</button>
      <button @click="addColumn">＋ Add column</button>
    </section>

    <div class="grids">
      <!-- ── Jspreadsheet CE ─────────────────────────────────────────── -->
      <div class="grid-panel">
        <h2>Jspreadsheet CE v5</h2>
        <p class="hint">
          • Double-click a cell to edit &nbsp;|&nbsp;
          • Drag column headers to reorder &nbsp;|&nbsp;
          • Double-click a header to rename it &nbsp;|&nbsp;
          • Select a range and Ctrl+C/V to copy/paste &nbsp;|&nbsp;
          • Drag the fill handle (bottom-right of selection) to autofill
        </p>
        <JspreadsheetTable v-model="dataSheet" />
      </div>

      <!-- ── AG Grid Enterprise ─────────────────────────────────────── -->
      <div class="grid-panel ag-panel">
        <h2>AG Grid Enterprise</h2>
        <p class="hint">
          • Click a cell to edit &nbsp;|&nbsp;
          • Drag column headers to reorder &nbsp;|&nbsp;
          • Double-click a header to rename it &nbsp;|&nbsp;
          • Select a range with Ctrl+Shift+click, then Ctrl+C/V &nbsp;|&nbsp;
          • Drag the fill handle (bottom-right of selection) to autofill
        </p>
        <AgGridTable v-model="dataSheet" />
      </div>
    </div>

    <!-- ── Live JSON preview ──────────────────────────────────────────── -->
    <section class="json-preview">
      <h2>Live <code>DataSheetJson</code> model</h2>
      <pre>{{ JSON.stringify(dataSheet, null, 2) }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JspreadsheetTable from './components/JspreadsheetTable.vue'
import AgGridTable from './components/AgGridTable.vue'
import type { DataSheetJson } from './types'

// ── Initial demo data ────────────────────────────────────────────────────────
const INITIAL: DataSheetJson = {
  type: 'dataSheet',
  id: 'demo-1',
  names: ['Product', 'Category', 'Price', 'Stock', 'Rating'],
  values: [
    ['Apple MacBook Pro', 'Laptop', '2499', '12', '4.8'],
    ['Dell XPS 15', 'Laptop', '1899', '25', '4.6'],
    ['Sony WH-1000XM5', 'Headphones', '349', '80', '4.9'],
    ['LG 27" 4K Monitor', 'Monitor', '699', '40', '4.7'],
    ['Logitech MX Keys', 'Keyboard', '109', '200', '4.5'],
    ['Samsung T7 SSD', 'Storage', '89', '150', '4.8'],
  ],
}

const dataSheet = ref<DataSheetJson>({ ...INITIAL, values: INITIAL.values.map((r) => [...r]) })

function resetData() {
  dataSheet.value = { ...INITIAL, values: INITIAL.values.map((r) => [...r]) }
}

function addRow() {
  dataSheet.value = {
    ...dataSheet.value,
    values: [...dataSheet.value.values, Array(dataSheet.value.names.length).fill('')],
  }
}

function addColumn() {
  const newColName = `Col ${dataSheet.value.names.length + 1}`
  dataSheet.value = {
    ...dataSheet.value,
    names: [...dataSheet.value.names, newColName],
    values: dataSheet.value.values.map((row) => [...row, '']),
  }
}
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f2f5;
  color: #1a1a2e;
}
</style>

<style scoped>
.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 16px;
}

.app-header {
  margin-bottom: 20px;
}

h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
  color: #1565c0;
}

.subtitle {
  margin: 0;
  color: #555;
  font-size: 0.95rem;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #1565c0;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.controls button:hover {
  background: #0d47a1;
}

.grids {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .grids {
    grid-template-columns: 1fr;
  }
}

.grid-panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 16px;
  overflow: hidden;
}

.grid-panel h2 {
  margin: 0 0 6px;
  font-size: 1.1rem;
  color: #333;
}

.hint {
  font-size: 0.78rem;
  color: #777;
  margin: 0 0 12px;
  line-height: 1.5;
}

.ag-panel {
  min-height: 420px;
}

/* Make ag-grid fill the panel */
.ag-panel :deep(.ag-grid-wrapper) {
  height: 380px;
}

.json-preview {
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 10px;
  padding: 20px;
  overflow: auto;
}

.json-preview h2 {
  margin: 0 0 12px;
  color: #89b4fa;
  font-size: 1.1rem;
}

pre {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
