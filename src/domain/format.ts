export const fmtNum = (n: number | null | undefined, d = 0) => n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(n)
export const fmtPct = (n: number | null | undefined) => n == null ? '—' : fmtNum(n, 1) + '%'
export const fmtDate = (iso?: string | null) => iso ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso)) : '—'
export const nowWib = () => new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }) + ' WIB'
/** Angka format Indonesia: "1.234,5" -> 1234.5; "12.500" -> 12500 (titik + 3 digit = pemisah ribuan); "-" / kosong -> null (bukan 0). */
export function parseIdNumber(v: unknown): number | null {
  if (v == null) return null
  let s = String(v).trim().replace(/\s|MT|ton/gi, '')
  if (!s || s === '-') return null
  const neg = /^\(.*\)$/.test(s)
  s = s.replace(/[()%]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? (neg ? -n : n) : null
}
export function parseIdDate(v: unknown): string | null {
  const s = String(v ?? '').trim(); let y = 0, mo = 0, d = 0
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/)
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3] < 100 ? 2000 + +m[3] : +m[3] } else { m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; y = +m[1]; mo = +m[2]; d = +m[3] }
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null
}
