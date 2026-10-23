import { fmtNum } from './format'
export const tone = (p: number | null) => p == null ? '#6b7280' : p >= 85 ? '#34d399' : p >= 60 ? '#fbbf24' : '#fb7185'
/** "22 Oktober 2026 pukul 15.23 WIB" -> "22 OKTOBER 2026, 15.23 WIB" */
export const fmtUpdate = (at: string) => at.replace(' pukul ', ', ').toUpperCase()
/** Gaya kolom "Sumber Tambang" laporan harian: BIB (6 tongkang 300ft; 45,1rb MT) */
export function sumberText(rows: any[]) {
  const g = new Map<string, { n: number; v: number; moda: Set<string> }>()
  for (const s of rows) { const k = s.mitra || '—'; const a = g.get(k) ?? { n: 0, v: 0, moda: new Set<string>() }; a.n++; a.v += s.volume ?? 0; if (s.moda) a.moda.add(String(s.moda).replace(/\s+/g, '')); g.set(k, a) }
  return [...g].map(([k, a]) => { const m = [...a.moda]; const vessel = m.length === 1 && /vessel/i.test(m[0]); return `${k} (${a.n} ${vessel ? 'vessel' : 'tongkang' + (m.length ? ' ' + m.join('/') : '')}; ${fmtNum(a.v / 1000, 1)}rb MT)` }).join(', ')
}
