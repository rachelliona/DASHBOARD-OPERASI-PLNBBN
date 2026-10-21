import Papa from 'papaparse'
export type Parsed = { headers: string[]; rows: Record<string, string>[]; errors: string[] }
export function parseCsv(text: string): Parsed {
  const r = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() })
  return { headers: r.meta.fields ?? [], rows: r.data, errors: r.errors.map(e => `Baris ${(e.row ?? 0) + 2}: ${e.message}`) }
}
export function downloadCsv(name: string, rows: Record<string, any>[]) {
  const blob = new Blob(['\ufeff' + Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click(); URL.revokeObjectURL(a.href)
}
