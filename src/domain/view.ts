import { fmtNum } from './format'
export const tone = (p: number | null) => p == null ? '#6b7280' : p >= 100 ? '#86efac' : p >= 85 ? '#34d399' : p >= 60 ? '#2dd4bf' : p >= 30 ? '#22d3ee' : '#60a5fa'
/** "22 Oktober 2026 pukul 15.23 WIB" -> "22 OKTOBER 2026, 15.23 WIB" */
export const fmtUpdate = (at: string) => at.replace(' pukul ', ', ').toUpperCase()
/** Gaya kolom "Sumber Tambang" laporan harian: BIB (6 tongkang 300ft; 45,1rb MT) */
export function sumberText(rows: any[]) {
  const g = new Map<string, { n: number; v: number; moda: Set<string> }>()
  for (const s of rows) { const k = s.mitra || '—'; const a = g.get(k) ?? { n: 0, v: 0, moda: new Set<string>() }; a.n++; a.v += s.volume ?? 0; if (s.moda) a.moda.add(String(s.moda).replace(/\s+/g, '')); g.set(k, a) }
  return [...g].map(([k, a]) => { const m = [...a.moda]; const vessel = m.length === 1 && /vessel/i.test(m[0]); return `${k} (${a.n} ${vessel ? 'vessel' : 'tongkang' + (m.length ? ' ' + m.join('/') : '')}; ${fmtNum(a.v / 1000, 1)}rb MT)` }).join(', ')
}

/** Penyingkatan bertahap teks sumber tambang: 1 = tongkang→tkg, 2 = tanpa "ft"/"MT", 3 = hanya nama (jumlah; volume). */
export function compactSumber(t: string, level: number) {
  let c = t
  if (level >= 1) c = c.replace(/tongkang/gi, 'tkg').replace(/vessel/gi, 'vsl')
  if (level >= 2) c = c.replace(/(\d)\s?ft\b/gi, '$1').replace(/\s?\/\s?/g, '/').replace(/\s*rb MT\)/g, 'rb)')
  if (level >= 3) c = c.replace(/\((\d+)\s+(?:tkg|vsl)[^;)]*;/g, '($1;').replace(/\s+;/g, ';')
  return c
}

/** Baca angka "TOTAL COMPLETE LOADING/UNLOADING 2026" langsung dari sheet DASHBOARD (Dashboard 1): baris nilai di bawah baris label berisi
 *  ... Complete Loading, %, Complete Unloading, %, TOTAL Loading, %, TOTAL Unloading, %. null bila tata letak tidak ditemukan. */
export type YtdSheet = { bl: number; blPct: number | null; ds: number; dsPct: number | null }
const num = (s: string) => { const t = String(s ?? '').trim(); if (!/^[\d.,]+%?$/.test(t)) return null; const v = parseFloat(t.replace('%', '').replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : null }
/** Pecah teks CSV menjadi sel mentah (mendukung tanda kutip) tanpa memotong kolom. */
export function csvGrid(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) { const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += c }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}
export function ytdFromSheet(headers: string[] | undefined, rows: Record<string, any>[]): YtdSheet | null {
  return ytdFromGrid([(headers ?? []).map(String), ...rows.map(r => Object.values(r).map(v => String(v ?? '')))])
}
export function ytdFromGrid(grid: string[][]): YtdSheet | null {
  for (let i = 0; i < grid.length; i++) {
    if (!/TOTAL COMPLETE LOADING 2026/i.test(grid[i].join('|'))) continue
    for (let j = i + 1; j <= i + 3 && j < grid.length; j++) {
      const cells = grid[j].map(c => c.trim()).filter(Boolean); if (cells.length < 8) continue
      const k = cells.length; const v = cells.slice(k - 4).map(num)
      if (v[0] != null && v[2] != null && v[0] > 1000 && v[2] > 1000 && cells[k - 3].endsWith('%') && cells[k - 1].endsWith('%')) return { bl: v[0], blPct: v[1], ds: v[2], dsPct: v[3] }
    }
  }
  return null
}
