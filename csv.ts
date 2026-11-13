import Papa from 'papaparse'
export type Parsed = { headers: string[]; rows: Record<string, string>[]; errors: string[]; headerRow: number; errorCells: number }
const ERR = /^#(N\/A|REF!|VALUE!|DIV\/0!|ERROR!|NAME\?|NUM!)$/i
/** Baris judul kolom dideteksi otomatis (baris dengan sel berhuruf terbanyak di 15 baris pertama), kecuali headerRow (1-based) diberikan. Sel error Sheets (#N/A, #REF!) dianggap kosong dan dihitung. */
export function parseCsv(text: string, headerRow?: number): Parsed {
  const r = Papa.parse<string[]>(text, { skipEmptyLines: false })
  const all = r.data as string[][]
  let h = headerRow ? headerRow - 1 : 0
  if (!headerRow) { let best = -1; all.slice(0, 15).forEach((row, i) => { const n = row.filter(c => /[A-Za-z]/.test(c ?? '')).length; if (n > best) { best = n; h = i } }) }
  const seen: Record<string, number> = {}
  const headers = (all[h] ?? []).map((c, i) => { const n = (c ?? '').trim() || `Kolom ${i + 1}`; seen[n] = (seen[n] ?? 0) + 1; return seen[n] > 1 ? `${n} (${seen[n]})` : n })
  let errorCells = 0
  const rows = all.slice(h + 1).filter(row => row.some(c => (c ?? '').trim() !== '')).map(row => Object.fromEntries(headers.map((k, i) => { let v = (row[i] ?? '').trim(); if (ERR.test(v)) { errorCells++; v = '' } return [k, v] })))
  return { headers, rows, errors: r.errors.map(e => `Baris ${(e.row ?? 0) + 1}: ${e.message}`), headerRow: h + 1, errorCells }
}
export function downloadCsv(name: string, rows: Record<string, any>[]) {
  const blob = new Blob(['\ufeff' + Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click(); URL.revokeObjectURL(a.href)
}
