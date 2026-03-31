<template>
  <div class="app">
    <header class="app-header">
      <h1>Editable Table – Debug Page</h1>
      <p class="subtitle">
        Choose the table implementation shown on the left and inspect the live
        <code>DataSheetJson</code>
        model on the right. Any edit in the table is reflected in the preview immediately.
      </p>
    </header>

    <section class="controls">
      <button @click="resetData">↺ Reset data</button>
      <button @click="addRow">＋ Add row</button>
      <button @click="addColumn">＋ Add column</button>
      <div class="table-switcher" aria-label="Table implementation switcher">
        <span class="switcher-label">Table view</span>
        <button
          :class="{ active: selectedTableImplementation === 'jspreadsheet' }"
          @click="selectedTableImplementation = 'jspreadsheet'"
        >
          Jspreadsheet CE
        </button>
        <button
          :class="{ active: selectedTableImplementation === 'agGrid' }"
          @click="selectedTableImplementation = 'agGrid'"
        >
          AG Grid
        </button>
      </div>
    </section>

    <div class="workspace">
      <section class="grid-panel table-panel" :class="{ 'ag-panel': selectedTableImplementation === 'agGrid' }">
        <h2>{{ currentTable.title }}</h2>
        <p class="hint">{{ formattedTableHints }}</p>
        <JspreadsheetTable v-if="selectedTableImplementation === 'jspreadsheet'" v-model="dataSheet" />
        <AgGridTable v-else v-model="dataSheet" />
      </section>

      <aside class="json-preview preview-panel">
        <h2>
          Live
          <code>DataSheetJson</code>
          model
        </h2>
        <div class="json-viewer" aria-label="Live DataSheetJson model">
          <div class="json-viewer__toolbar">
            <span class="json-viewer__dot"></span>
            <span class="json-viewer__dot"></span>
            <span class="json-viewer__dot"></span>
            <span class="json-viewer__title">datasheet.json</span>
          </div>
          <div class="json-lines">
            <div v-for="(line, index) in jsonPreviewLines" :key="index" class="json-line">
              <span class="json-line__number">{{ index + 1 }}</span>
              <span class="json-line__content" :style="{ paddingLeft: `${line.indent * 20}px` }">
                <span
                  v-for="(piece, pieceIndex) in line.pieces"
                  :key="`${index}-${pieceIndex}`"
                  :class="['json-token', `json-token--${piece.type}`]"
                >
                  {{ piece.text }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
    ['Samsung T7 SSD', 'Storage', '89', '150', '4.8']
  ]
}
const HINT_SEPARATOR = ' • '

type JsonTokenType = 'brace' | 'key' | 'string' | 'punctuation'
type JsonPreviewLine = {
  indent: number
  pieces: Array<{
    text: string
    type: JsonTokenType
  }>
}

const dataSheet = ref<DataSheetJson>({ ...INITIAL, values: INITIAL.values.map((r) => [...r]) })
const selectedTableImplementation = ref<'jspreadsheet' | 'agGrid'>('jspreadsheet')
const tableDescriptions = {
  jspreadsheet: {
    title: 'Jspreadsheet CE v5',
    hints: [
      'Double-click a cell to edit',
      'Drag column headers to reorder',
      'Double-click a header to rename it',
      'Select a range and Ctrl+C/V to copy/paste',
      'Drag the fill handle (bottom-right of selection) to autofill'
    ]
  },
  agGrid: {
    title: 'AG Grid Enterprise',
    hints: [
      'Click a cell to edit',
      'Drag column headers to reorder',
      'Double-click a header to rename it',
      'Select a range with Ctrl+Shift+click, then Ctrl+C/V',
      'Drag the fill handle (bottom-right of selection) to autofill'
    ]
  }
} as const
const currentTable = computed(() => tableDescriptions[selectedTableImplementation.value])
const formattedTableHints = computed(() => currentTable.value.hints.join(HINT_SEPARATOR))
const jsonPreviewLines = computed<JsonPreviewLine[]>(() => {
  const quoted = (value: string) => JSON.stringify(value)
  const lines: JsonPreviewLine[] = [
    { indent: 0, pieces: [{ text: '{', type: 'brace' }] },
    {
      indent: 1,
      pieces: [
        { text: '"type"', type: 'key' },
        { text: ': ', type: 'punctuation' },
        { text: quoted(dataSheet.value.type), type: 'string' },
        { text: ',', type: 'punctuation' }
      ]
    },
    {
      indent: 1,
      pieces: [
        { text: '"id"', type: 'key' },
        { text: ': ', type: 'punctuation' },
        { text: quoted(dataSheet.value.id), type: 'string' },
        { text: ',', type: 'punctuation' }
      ]
    },
    {
      indent: 1,
      pieces: [
        { text: '"names"', type: 'key' },
        { text: ': [', type: 'punctuation' }
      ]
    }
  ]

  dataSheet.value.names.forEach((name, index) => {
    lines.push({
      indent: 2,
      pieces: [
        { text: quoted(name), type: 'string' },
        {
          text: index < dataSheet.value.names.length - 1 ? ',' : '',
          type: 'punctuation'
        }
      ]
    })
  })

  lines.push({
    indent: 1,
    pieces: [{ text: '],', type: 'punctuation' }]
  })
  lines.push({
    indent: 1,
    pieces: [
      { text: '"values"', type: 'key' },
      { text: ': [', type: 'punctuation' }
    ]
  })

  dataSheet.value.values.forEach((row, rowIndex) => {
    lines.push({
      indent: 2,
      pieces: [{ text: '[', type: 'brace' }]
    })

    row.forEach((cell, cellIndex) => {
      lines.push({
        indent: 3,
        pieces: [
          { text: quoted(cell), type: 'string' },
          { text: cellIndex < row.length - 1 ? ',' : '', type: 'punctuation' }
        ]
      })
    })

    lines.push({
      indent: 2,
      pieces: [
        {
          text: rowIndex < dataSheet.value.values.length - 1 ? '],' : ']',
          type: 'punctuation'
        }
      ]
    })
  })

  lines.push({
    indent: 1,
    pieces: [{ text: ']', type: 'punctuation' }]
  })
  lines.push({
    indent: 0,
    pieces: [{ text: '}', type: 'brace' }]
  })

  return lines
})

function resetData() {
  dataSheet.value = { ...INITIAL, values: INITIAL.values.map((r) => [...r]) }
}

function addRow() {
  dataSheet.value = {
    ...dataSheet.value,
    values: [...dataSheet.value.values, Array(dataSheet.value.names.length).fill('')]
  }
}

function addColumn() {
  const newColName = `Col ${dataSheet.value.names.length + 1}`
  dataSheet.value = {
    ...dataSheet.value,
    names: [...dataSheet.value.names, newColName],
    values: dataSheet.value.values.map((row) => [...row, ''])
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
  width: 100%;
  height: 100svh;
  max-height: 100svh;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  margin-bottom: 20px;
  flex-shrink: 0;
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
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
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

.table-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 6px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.switcher-label {
  font-size: 0.85rem;
  color: #555;
  padding: 0 6px 0 8px;
}

.table-switcher button {
  background: transparent;
  color: #1565c0;
}

.table-switcher button:hover {
  background: rgba(21, 101, 192, 0.1);
}

.table-switcher button.active {
  background: #1565c0;
  color: #fff;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(360px, 1fr);
  gap: 20px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 900px) {
  .table-switcher {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }

  .switcher-label {
    padding-right: 0;
  }

  .workspace {
    grid-template-columns: 1fr;
  }
}

.grid-panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 16px;
  min-height: 0;
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

.table-panel {
  min-width: 0;
  overflow: auto;
}

.json-preview {
  background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
  color: #cdd6f4;
  border-radius: 10px;
  padding: 20px;
  min-height: 0;
  overflow: auto;
}

.preview-panel {
  min-height: 0;
}

.json-preview h2 {
  margin: 0 0 12px;
  color: #89b4fa;
  font-size: 1.1rem;
}

.json-viewer {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.65);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.json-viewer__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(30, 41, 59, 0.7);
}

.json-viewer__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f59e0b;
}

.json-viewer__dot:nth-child(2) {
  background: #22c55e;
}

.json-viewer__dot:nth-child(3) {
  background: #38bdf8;
}

.json-viewer__title {
  margin-left: 6px;
  font-size: 0.78rem;
  color: #cbd5e1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.json-lines {
  padding: 12px 0;
}

.json-line {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-height: 1.6rem;
  padding: 0 14px;
}

.json-line__number {
  color: rgba(148, 163, 184, 0.7);
  text-align: right;
  user-select: none;
}

.json-line__content {
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.json-token--brace,
.json-token--punctuation {
  color: #94a3b8;
}

.json-token--key {
  color: #7dd3fc;
}

.json-token--string {
  color: #86efac;
}
</style>
