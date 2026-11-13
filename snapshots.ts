/** Snapshot harian disimpan di cabang `data` repositori (file snapshots/AAAA-BB-HH.json). Di GitHub Pages alamat dasar diturunkan otomatis dari URL situs. */
export const SNAPSHOT_BASE_FALLBACK = 'https://raw.githubusercontent.com/rachelliona/DASHBOARD-OPERASI-PLNBBN/data/snapshots'
export function snapBase(): string {
  try {
    const o = localStorage.getItem('pln-snap-base'); if (o) return o.replace(/\/$/, '')
    const h = location.hostname, repo = location.pathname.split('/')[1]
    if (h.endsWith('.github.io') && repo) return `https://raw.githubusercontent.com/${h.split('.')[0]}/${repo}/data/snapshots`
  } catch { /* di luar peramban */ }
  return SNAPSHOT_BASE_FALLBACK
}
