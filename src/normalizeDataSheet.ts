import type { DataSheetJson } from './types'

function normalizeRowLength(row: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? '')
}

export function isRowCompletelyEmpty(row: string[], columnCount: number) {
  return normalizeRowLength(row, columnCount).every((cell) => cell === '')
}

export function removeEmptyRows(values: string[][], columnCount: number) {
  return values
    .map((row) => normalizeRowLength(row, columnCount))
    .filter((row) => !isRowCompletelyEmpty(row, columnCount))
}

export function areRowMatrixesEqual(left: string[][], right: string[][]) {
  return (
    left.length === right.length &&
    left.every(
      (row, rowIndex) =>
        row.length === (right[rowIndex]?.length ?? -1) &&
        row.every((cell, cellIndex) => cell === right[rowIndex]?.[cellIndex])
    )
  )
}

export function sanitizeDataSheetRows(sheet: DataSheetJson): DataSheetJson {
  const columnCount = sheet.names.length

  return {
    ...sheet,
    values: removeEmptyRows(sheet.values, columnCount)
  }
}