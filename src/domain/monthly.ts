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
export type Ship = { id: string; plant: string; konf: 'carry' | 'bulan' | 'lain'; jumlah: number | null; tbbg: string; status: string; stage: string | null; si: string; mitraReal: string; sumber: string; jetty: string; transport: string; bl: number | null; ds: number | null; vol: number }
const NEED = ['PLTU', 'Konfirmasi', 'Jumlah', 'Status', 'B/L', 'D/S']
/** Baris sheet bulanan -> shipment. Dilewati: judul kelompok, Subtotal, baris kosong/#N/A (tanpa Jumlah dan B/L). */
export function parseMonthly(t: Tbl, bulan: string) {
  const missing = NEED.filter(h => !t.headers.includes(h)); const ships: Ship[] = []; const sub = { jumlah: 0, bl: 0, ds: 0 }; let skipped = 0
  if (missing.length) return { ships, sub, skipped, missing }
  t.rows.forEach((r, i) => {
    const name = (r['PLTU'] ?? '').trim(); if (!name) return
    const n = (k: string) => parseIdNumber(r[k])
    if (/^subtotal$/i.test(name)) { sub.jumlah += n('Jumlah') ?? 0; sub.bl += n('B/L') ?? 0; sub.ds += n('D/S') ?? 0; return }
    const jumlah = n('Jumlah'), bl = n('B/L'), ds = n('D/S'); if (jumlah == null && bl == null) { skipped++; return }
    const status = (r['Status'] ?? '').trim(), stage = stageOf(status), tbbg = (r['TB/BG'] ?? '').trim(), kr = (r['Konfirmasi'] ?? '').trim(), si = (r['No. SI'] ?? '').trim()
    const vol = stage === 'unloading' ? ds ?? bl ?? jumlah ?? 0 : stage === 'sailing' || stage === 'tiba' || stage === 'bongkar' ? bl ?? jumlah ?? 0 : jumlah ?? bl ?? 0
    ships.push({ id: si ? `${si} · ${tbbg.split(';')[0].trim()}` : `${bulan}#${i + 1}`, plant: plantName(name), konf: /carry/i.test(kr) ? 'carry' : norm(kr) === norm(bulan) ? 'bulan' : 'lain', jumlah, tbbg, status, stage, si,
      mitraReal: (r['Mitra Real.'] ?? '').trim(), sumber: (r['Sumber Tambang'] ?? '').trim(), jetty: (r['Jetty'] ?? '').trim(), transport: (r['Mitra Transport'] ?? '').trim(), bl, ds, vol })
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
export const toShipRows = (ships: Ship[]) => ships.map(s => ({ id: s.id, si: s.si || null, pltu: s.plant, wilayah: regionOf(s.plant), asal: s.jetty || null, mitraTambang: s.sumber || null, mitraTransport: s.transport || null, kapal: s.tbbg || null, volume: s.vol, status: s.stage, statusRaw: s.status || null, eta: null, keterangan: null }))
export function groupBy(ships: Ship[], key: (s: Ship) => string) {
  const m = new Map<string, any>()
  for (const s of ships) { const k = key(s) || '—'; const a = m.get(k) ?? { nama: k, n: 0, konf: 0, co: 0, bl: 0, ds: 0 }; a.n++; if (s.konf === 'bulan') a.konf += s.jumlah ?? 0; if (s.konf === 'carry') a.co += s.jumlah ?? 0; a.bl += s.bl ?? 0; a.ds += s.ds ?? 0; m.set(k, a) }
  return [...m.values()].sort((a, b) => b.ds - a.ds)
}
export const totals = (ships: Ship[]) => groupBy(ships, () => 'x').map(({ nama, ...t }) => t)[0] ?? { n: 0, konf: 0, co: 0, bl: 0, ds: 0 }
