import { parseIdNumber } from './format'
import { norm, stageOf } from './status'
import { LOKASI_ROWS } from '../config/lokasi'
import { REGION_OF } from '../config/regions'
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export type Tbl = { headers: string[]; rows: Record<string, string>[] }
const CANON = new Map(LOKASI_ROWS.map(l => [norm(l.nama), l.nama]))
const REGION_BY = new Map(Object.entries(REGION_OF).flatMap(([r, a]) => a.map(n => [norm(n), r] as [string, string])))
/** "Adipala (PC) LRC" -> "Adipala"; memakai nama baku Master Data Pembangkit bila cocok. */
export const plantName = (raw: string) => { const c = raw.replace(/\s*-\s*transhipment.*$/i, '').replace(/\s*\([^)]*\)/g, '').replace(/\b(LRC|MRC)\b/gi, '').replace(/\s+/g, ' ').trim(); return CANON.get(norm(c)) ?? c }
export const regionOf = (n: string) => REGION_BY.get(norm(n)) ?? null
export type Ship = { id: string; plant: string; konf: 'carry' | 'bulan' | 'lain'; jumlah: number | null; tbbg: string; status: string; stage: string | null; si: string; mitraReal: string; sumber: string; jetty: string; transport: string; moda: string; konfRaw: string; ms: (number | null)[]; anom: boolean; bl: number | null; ds: number | null; vol: number }
export function parseDT(v: unknown): number | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*(?:(\d{1,2}):(\d{2}))?$/); if (!m) return null
  const y = +m[3] < 100 ? 2000 + +m[3] : +m[3], mo = +m[2], d = +m[1]; if (y < 2025 || y > 2027 || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const t = Date.UTC(y, mo - 1, d, +(m[4] ?? 0), +(m[5] ?? 0)); return new Date(t).getUTCMonth() === mo - 1 ? t : null
}
/** Tgl. SI di sheet tanpa tahun ("12/10"): tahun diambil dari milestone berikutnya; bulan SI jauh setelah bulan acuan = tahun sebelumnya. */
export function parseSI(v: unknown, ref: number | null): number | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})$/); if (!m) return parseDT(v); if (ref == null) return null
  const mo = +m[2], d = +m[1], r = new Date(ref), y = mo > r.getUTCMonth() + 1 + 6 ? r.getUTCFullYear() - 1 : r.getUTCFullYear(); const t = Date.UTC(y, mo - 1, d)
  return new Date(t).getUTCMonth() === mo - 1 ? t : null
}
export const STEPS = ['SI → TA POL', 'TA POL → Sandar muat', 'Sandar → Mulai muat', 'Durasi muat', 'Selesai muat → Berlayar', 'Pelayaran', 'TA PLTU → Sandar bongkar', 'Sandar → Mulai bongkar', 'Durasi bongkar']
/** Lama tiap tahap dalam hari; null bila salah satu tanggal kosong atau urutannya terbalik (data tidak wajar). */
export const stepDays = (ms: (number | null)[]) => STEPS.map((_, i) => { const a = ms[i], b = ms[i + 1]; return a != null && b != null && b >= a ? (b - a) / 864e5 : null })
const MS_KEYS = ['tglsi', 'tapol', 'berthing', 'commenceloading', 'completeloading', 'sailingtime', 'tapltu', 'berthing2', 'commenceunloading', 'completeunloading']
const NEED = ['PLTU', 'Konfirmasi', 'Jumlah', 'Status', 'B/L', 'D/S']
/** Baris sheet bulanan -> shipment. Dilewati: judul kelompok, Subtotal, baris kosong/#N/A (tanpa Jumlah dan B/L). */
export function parseMonthly(t: Tbl, bulan: string) {
  const missing = NEED.filter(h => !t.headers.includes(h)); const ships: Ship[] = []; const sub = { jumlah: 0, bl: 0, ds: 0 }; let skipped = 0
  if (missing.length) return { ships, sub, skipped, missing }
  const H: Record<string, string> = Object.fromEntries(t.headers.map(h => [norm(h), h]))
  t.rows.forEach((r, i) => {
    const name = (r['PLTU'] ?? '').trim(); if (!name || name === 'PLTU' || /^total$/i.test(name)) return
    const n = (k: string) => parseIdNumber(r[k])
    if (/^subtotal$/i.test(name)) { sub.jumlah += n('Jumlah') ?? 0; sub.bl += n('B/L') ?? 0; sub.ds += n('D/S') ?? 0; return }
    const jumlah = n('Jumlah'), bl = n('B/L'), ds = n('D/S'); if (jumlah == null && bl == null) { skipped++; return }
    const status = (r['Status'] ?? '').trim(), stage = stageOf(status), tbbg = (r['TB/BG'] ?? '').trim(), kr = (r['Konfirmasi'] ?? '').trim(), si = (r['No. SI'] ?? '').trim()
    const vol = stage === 'unloading' ? ds ?? bl ?? jumlah ?? 0 : stage === 'sailing' || stage === 'tiba' || stage === 'bongkar' ? bl ?? jumlah ?? 0 : jumlah ?? bl ?? 0
    const g = (k: string) => r[H[k]] ?? ''; const ms: (number | null)[] = [null, ...MS_KEYS.slice(1).map(k => parseDT(g(k)))]; ms[0] = parseSI(g('tglsi'), ms.slice(1).find(x => x != null) ?? null)
    ships.push({ id: si ? `${si} · ${tbbg.split(';')[0].trim()}` : `${bulan}#${i + 1}`, plant: plantName(name), konf: /carry/i.test(kr) ? 'carry' : norm(kr) === norm(bulan) ? 'bulan' : 'lain', jumlah, tbbg, status, stage, si,
      mitraReal: (r['Mitra Real.'] ?? '').trim(), sumber: (r['Sumber Tambang'] ?? '').trim(), jetty: (r['Jetty'] ?? '').trim(), transport: (r['Mitra Transport'] ?? '').trim(), moda: (r['Moda'] ?? '').trim(), konfRaw: kr, ms, anom: !!(bl && ds && Math.abs(ds - bl) / bl > 0.05), bl, ds, vol })
  })
  return { ships, sub, skipped, missing }
}
/** Satu baris per PLTU. target = Σ Jumlah berkonfirmasi bulan ini; carryOver = Σ Jumlah berkonfirmasi Carry Over; volume tahapan menurut kolom Status (Selesai Bongkar memakai D/S, tahap lain B/L). */
export function aggregatePlants(ships: Ship[]) {
  const m = new Map<string, any>()
  const get = (name: string) => { const k = norm(name); if (!m.has(k)) m.set(k, { pltu: name, wilayah: regionOf(name), target: 0, carryOver: 0, terjadwal: 0, loading: 0, sailing: 0, tiba: 0, bongkar: 0, unloading: 0, lain: 0, bl: 0, ds: 0, n: 0, sumberSet: new Set<string>() }); return m.get(k) }
  Object.values(REGION_OF).flat().forEach(get)
  for (const s of ships) { const a = get(s.plant); a.n++; if (s.konf === 'bulan') a.target += s.jumlah ?? 0; if (s.konf === 'carry') a.carryOver += s.jumlah ?? 0; a[s.stage ?? 'lain'] += s.vol; a.bl += s.bl ?? 0; a.ds += s.ds ?? 0; if (s.mitraReal) a.sumberSet.add(s.mitraReal) }
  return [...m.values()].map(({ sumberSet, ...a }) => ({ ...a, sumber: [...sumberSet].join(', ') || null, keterangan: null }))
}
export const toShipRows = (ships: Ship[]) => ships.map(s => ({ id: s.id, si: s.si || null, pltu: s.plant, wilayah: regionOf(s.plant), asal: s.jetty || null, mitraTambang: s.sumber || null, mitraTransport: s.transport || null, mitra: s.mitraReal || null, moda: s.moda || null, konf: s.konf, jumlah: s.jumlah, kapal: s.tbbg || null, volume: s.vol, status: s.stage, statusRaw: s.status || null, eta: null, keterangan: null }))
export function groupBy(ships: Ship[], key: (s: Ship) => string) {
  const m = new Map<string, any>()
  for (const s of ships) { const k = key(s) || '—'; const a = m.get(k) ?? { nama: k, n: 0, konf: 0, co: 0, bl: 0, ds: 0 }; a.n++; if (s.konf === 'bulan') a.konf += s.jumlah ?? 0; if (s.konf === 'carry') a.co += s.jumlah ?? 0; a.bl += s.bl ?? 0; a.ds += s.ds ?? 0; m.set(k, a) }
  return [...m.values()].sort((a, b) => b.ds - a.ds)
}
export const totals = (ships: Ship[]) => groupBy(ships, () => 'x').map(({ nama, ...t }) => t)[0] ?? { n: 0, konf: 0, co: 0, bl: 0, ds: 0 }
/** Rekap tahun berjalan per PLTU dari sheet ALL Shipment: kebutuhan = Σ Jumlah (konfirmasi + carry over awal tahun), realisasi = Σ D/S. */
export function aggregateYtd(ships: Ship[]) {
  const m = new Map<string, any>()
  for (const s of ships) { const k = norm(s.plant); const a = m.get(k) ?? { pltu: s.plant, wilayah: regionOf(s.plant), keb: 0, bl: 0, ds: 0, n: 0, bln: BULAN.map(b => ({ b, j: 0, ds: 0 })) }
    a.keb += s.jumlah ?? 0; a.bl += s.bl ?? 0; a.ds += s.ds ?? 0; a.n++; const i = BULAN.findIndex(b => norm(b) === norm(s.konfRaw)); if (i >= 0) { a.bln[i].j += s.jumlah ?? 0; a.bln[i].ds += s.ds ?? 0 }; m.set(k, a) }
  return [...m.values()].map(a => ({ ...a, p: a.keb > 0 ? (a.ds / a.keb) * 100 : null }))
}
export function pctl(sorted: number[], p: number) { if (!sorted.length) return null; const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo) }
