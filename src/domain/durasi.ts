import Papa from 'papaparse'
import { useEffect, useState } from 'react'
import { cachedSheet, freshSheet } from './sheetCache'
/** Sheet "DURASI BBN - BAG" pada spreadsheet Monitoring Rencana Pasokan (angka format US, tanggal dd/mm/yy). */
export const DURASI_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbaCCMcXx8T4M14UVScSSz6EB_nAyvsUSBxNkVpx8v2XGULPNVWKABwtfrgHsTqBgbvyE5Mofvq3Wr/pub?gid=1324635653&single=true&output=csv'
export type DRow = { mitra: string; pol: string; pod: string; moda: string; kso: string; volRen: number | null; volReal: number | null; etaPolRen: number | null; etaPolReal: number | null; etaPodRen: number | null; etaPodReal: number | null; bl: number | null; ds: number | null; short: number | null; hari: number | null; status: string }
const us = (v: unknown) => { const s = String(v ?? '').replace(/[%\s]/g, '').replace(/,/g, ''); if (!s || s === '-') return null; const n = Number(s); return isFinite(n) ? n : null }
const yr = (y: string) => (y.length === 2 ? 2000 + +y : +y)
/** "15/01/26" -> ms UTC; rentang "01-03/01" -> tanggal akhir rentang (tahun mengikut ref). */
export function tgl(v: unknown, ref?: number | null): number | null {
  const s = String(v ?? '').trim(); let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) return Date.UTC(yr(m[3]), +m[2] - 1, +m[1])
  m = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/); if (m) { const y = ref ? new Date(ref).getUTCFullYear() : 2026; return Date.UTC(y, +m[3] - 1, +m[2]) }
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/); if (m) { const y = ref ? new Date(ref).getUTCFullYear() : 2026; return Date.UTC(y, +m[2] - 1, +m[1]) }
  return null
}
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim()
export function parseDurasi(text: string): DRow[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => /^shipper/i.test(clean(r[3] ?? '')) || clean(r[1] ?? '') === 'Region'); const h = hi >= 0 ? hi : 6
  const H = (all[h] ?? []).map(clean); const col = (re: RegExp, from = 0) => H.findIndex((c, i) => i >= from && re.test(c))
  const c = { mitra: col(/^Shipper \(Fix\)/), mitra0: col(/^SHIPPER$/i), pol: col(/^POL$/), pod: col(/^POD \(Fix\)/), moda: col(/^Moda/), kso: col(/^KSO/), volRen: col(/^Volume Rencana/), volReal: col(/^Volume Realisasi/), polRen: col(/^ETA POL Rencana/), polReal: col(/^ETA POL Realisasi/), podRen: col(/^ETA POD Rencana/), podReal: col(/^ETA POD$/), bl: col(/^BL \(load\)/i), ds: col(/^DS \(Disch/i), short: col(/^Shortage \(%\)/), hari: col(/^Durasi sailing/), status: col(/^Status Shipment/) }
  const out: DRow[] = []
  for (const r of all.slice(h + 1)) {
    const pod = clean(r[c.pod] ?? ''), pol = clean(r[c.pol] ?? ''); const mitra = clean(r[c.mitra] ?? '') || clean(r[c.mitra0] ?? ''); if (!pod || !pol || !mitra || /^#/.test(pod)) continue
    const ep = tgl(r[c.podReal]), el = tgl(r[c.polReal])
    out.push({ mitra, pol, pod, moda: clean(r[c.moda] ?? ''), kso: clean(r[c.kso] ?? ''), volRen: us(r[c.volRen]), volReal: us(r[c.volReal]), etaPolReal: el, etaPolRen: tgl(r[c.polRen], el), etaPodReal: ep, etaPodRen: tgl(r[c.podRen], ep), bl: us(r[c.bl]), ds: us(r[c.ds]), short: us(r[c.short]), hari: us(r[c.hari]), status: clean(r[c.status] ?? '') })
  }
  return out
}
export function useDurasi() {
  const [rows, setRows] = useState<DRow[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => { let ok = true; (async () => { const c = await cachedSheet('DURASI BBN-BAG'); if (c && ok) setRows(parseDurasi(c.t))
    try { const f = await freshSheet('DURASI BBN-BAG', DURASI_URL, 600000); if (ok) setRows(parseDurasi(f.t)) } catch (e: any) { if (ok && !c) setErr(e.message) } })(); return () => { ok = false } }, [])
  return { rows, err }
}
export const kunci = (s: string) => s.toLowerCase().replace(/\b(pltu|pt|unit|tuks|jetty|duks)\b/g, '').replace(/[^a-z0-9]/g, '')
/** Rata-rata durasi pelayaran (hari) per rute POL -> POD, opsional dibatasi ke satu PLTU (cocok nama longgar). */
export function ruteDurasi(rows: DRow[], plant?: string) {
  const k = plant ? kunci(plant) : ''; const m = new Map<string, { pol: string; pod: string; v: number[] }>()
  for (const r of rows) { if (r.hari == null || r.hari <= 0) continue; if (k) { const p = kunci(r.pod); if (!p || !(p === k || p.includes(k) || k.includes(p))) continue }
    const key = r.pol + '→' + r.pod; const a = m.get(key) ?? { pol: r.pol, pod: r.pod, v: [] }; a.v.push(r.hari); m.set(key, a) }
  return [...m.values()].map(a => ({ pol: a.pol, pod: a.pod, n: a.v.length, avg: a.v.reduce((x, y) => x + y, 0) / a.v.length, min: Math.min(...a.v), max: Math.max(...a.v) })).sort((a, b) => b.n - a.n || a.pol.localeCompare(b.pol))
}
/** Skor kinerja transport (formulir Excel): selisih ETA dalam hari, shortage dalam %. */
export const skorEta = (d: number | null) => d == null ? null : d < 2 ? 100 : d < 4 ? 95 : d < 6 ? 90 : d < 14 ? 75 : d < 30 ? 50 : 25
export const skorShort = (p: number | null) => p == null ? 25 : p < 2 ? 100 : p < 5 ? 90 : p < 10 ? 75 : 50
export const kategori = (s: number) => s >= 95 ? 'Excellent' : s >= 88 ? 'Good' : s >= 78 ? 'Fair' : 'Poor'
