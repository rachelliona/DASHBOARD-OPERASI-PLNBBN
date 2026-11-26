import Papa from 'papaparse'
import type { OdsDoc, OdsMitra } from './ods'
import { umurN4 } from './ods'
/** Sheet "[NEW] List Hutang Batubara" (dipublikasikan): tab Executive Summary + tab Hutang Batubara 2026 (baris shipment). */
export const BB_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWu8F3ptqrfwbubLQ55j_XzWa3aJMq4y8K_eueRsGb-Q-Rhy3g34ArxAs6Q4b4ArX0t6MLknv5JnYM/pub'
export const BB_ES_URL = BB_BASE + '?gid=22381168&single=true&output=csv'
export const BB_DOC_URL = BB_BASE + '?gid=900925678&single=true&output=csv'
export const BB_SHEET_LINK = BB_BASE + 'html'
export const BB_PROSES: Record<string, string> = { '2': 'Belum kontrak / belum tagih (N1–N2)', '3': 'Proses verifikasi (N3)', '4': 'Siap bayar (N4)', '5': 'Sudah dibayar' }
const c = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const num = (s: unknown) => { const v = c(s).replace(/[^0-9.,-]/g, '').replace(/,/g, ''); const n = parseFloat(v); return isFinite(n) ? n : 0 }
/** Kode mitra dari kolom SUMBER TAMBANG: "JG - AI" -> JG. */
export const kodeMitra = (t: string) => c(t).split(/\s+-\s+/)[0].toUpperCase()
/** Baris shipment (judul kolom "NO SI" + "SUMBER TAMBANG"). PROSES BBN: 1 belum kontrak, 2 belum tagih, 3 verifikasi, 4 siap bayar, 5 sudah dibayar. Nilai hutang = HARGA (sama dengan Executive Summary). */
export function parseBbDocs(text: string): OdsDoc[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => r.some(x => /^NO SI$/i.test(c(x))) && r.some(x => /^SUMBER TAMBANG$/i.test(c(x)))); if (hi < 0) return []
  const H = all[hi].map(x => c(x).toUpperCase()); const f = (re: RegExp, d: number) => { const i = H.findIndex(h => re.test(h)); return i >= 0 ? i : d }
  const k = { si: f(/^NO SI$/, 2), tb: f(/^SUMBER TAMBANG$/, 3), skema: f(/^SKEMA$/, 4), ke: f(/^SHIP KE$/, 6), kapal: f(/^SHIPMENT$/, 7), vol: f(/^VOLUME$/, 8), tujuan: f(/^TUJUAN$/, 9), bulan: f(/^BULAN PASOKAN$/, 11), proses: f(/^PROSES BBN$/, 12),
    harga: f(/^HARGA$/, 13), dpp: f(/^DPP$/, 14), ppn: f(/^PPN/, 15), pph: f(/^PPH/, 16), real: f(/^REALISASI$/, 17), due: f(/^DUE DATE$/, 20), lama: f(/^LAMA OVER/, 25), ket: f(/^KETERANGAN$/, 27), umur: f(/^KLASIFIKASI UMUR/, 29) }
  const out: OdsDoc[] = []
  for (const r of all.slice(hi + 1)) { const p = c(r[k.proses]).replace(/\.0+$/, ''); if (!/^[1-5]$/.test(p)) continue; const tb = c(r[k.tb]); if (!tb) continue
    const lama = c(r[k.lama]).replace(/[^0-9-]/g, '')
    out.push({ si: c(r[k.si]), jenis: c(r[k.skema]), termin: '', kapal: c(r[k.kapal]), tujuan: c(r[k.tujuan]), invoice: '', tglInv: '', mitra: kodeMitra(tb), proses: p === '1' ? '2' : p, prosesAsli: p, nilai: num(r[k.harga]), due: c(r[k.due]), lamaOd: lama && lama !== '-' ? +lama : null, ket: c(r[k.ket]), umur: c(r[k.umur]),
      tambang: tb, shipKe: c(r[k.ke]), volume: num(r[k.vol]), bulan: c(r[k.bulan]), harga: num(r[k.harga]), dpp: num(r[k.dpp]), ppn: num(r[k.ppn]), pph: num(r[k.pph]), realisasi: num(r[k.real]) }) }
  return out
}
/** Daftar kode mitra di tabel Executive Summary 2026 (judul "Mitra" setelah baris tahun 2026). */
export function mitraEs2026(text: string): string[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const y = all.findIndex(r => r.some(x => /^2,?026(\.0+)?$/.test(c(x)))); const hi = all.findIndex((r, i) => i > y && r.some(x => c(x) === 'Mitra')); if (y < 0 || hi < 0) return []
  const k = all[hi].findIndex(x => c(x) === 'Mitra'); const out: string[] = []
  for (const r of all.slice(hi + 1)) { const m = c(r[k]); if (!m) continue; if (/^total$/i.test(m)) break; out.push(m.toUpperCase()) }
  return out
}
/** Rekap per mitra dari baris shipment yang belum dibayar (proses 1-4). */
export function rekapBb(docs: OdsDoc[], namaEs: string[] = []): OdsMitra[] {
  const M = new Map<string, OdsMitra>(); const get = (m: string) => { let x = M.get(m); if (!x) M.set(m, x = { m, n2: 0, n3: 0, n4: 0, b: 0, o1: 0, o2: 0, t: 0, dokN4: 0, dokN3: 0 }); return x }
  for (const m of namaEs) get(m)
  for (const d of docs) { if (!['2', '3', '4'].includes(d.proses)) continue; const x = get(d.mitra); const v = d.nilai; x.t += v
    if (d.proses === '2') x.n2 += v; else if (d.proses === '3') { x.n3 += v; x.dokN3++ } else { x.n4 += v; x.dokN4++; const u = umurN4(d); if (u === 'o1') x.o1 += v; else if (u === 'o2') x.o2 += v; else x.b += v } }
  return [...M.values()]
}
