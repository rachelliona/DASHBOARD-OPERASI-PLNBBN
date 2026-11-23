import { parseRentang, iso } from './logic'
import { SI, kosong } from './types'
import type { Alasan } from './types'
export const alasanDari = (t: string): Alasan | '' => !t ? '' : /(nama|ganti|perubahan)\s*(kapal|tb|bg|tongkang|barge|vessel|tug)|kapal|tongkang|\bTB\/BG|armada/i.test(t) ? 'armada' : /laycan|eta/i.test(t) ? 'laycan' : /jumlah|volume|muatan/i.test(t) ? 'volume' : /pelabuhan|consignee|notify/i.test(t) ? 'pelabuhan' : 'lainnya'
const up = (s: string) => (s || '').trim()
/** Baris sheet "SHIPPING INSTRUCTION 2026" (grid bernomor; Andi/Billy mengisi barisnya). Header di baris ke-3. */
export function dariSheet(csv: string, tahun = 2026, now = new Date()): SI[] {
  const lines = csvRows(csv); const hi = lines.findIndex(r => r.some(c => /^nomor si$/i.test(c.trim()))); if (hi < 0) return []
  const h = lines[hi].map(c => c.trim().toLowerCase()); const col = (n: string) => h.indexOf(n)
  const cTgl = col('tanggal'), cNo = col('nomor si'), cRev = col('nomor si rev'), cPem = col('pemohon'), cTb = col('sumber tambang'), cMuat = col('pelabuhan muat'), cLay = col('laycan'), cEta = col('eta pod'), cBon = col('pelabuhan bongkar'), cKep = col('kepada'), cKet = col('keterangan revisi')
  const out: SI[] = []; let ref = `${tahun}-01-01`; const today = iso(now)
  lines.slice(hi + 1).forEach(r => {
    const no = parseInt(r[cNo] ?? '', 10); if (!no) return
    const tg = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(r[cTgl] ?? ''); const tgIso = tg ? `${tg[3]}-${tg[2].padStart(2, '0')}-${tg[1].padStart(2, '0')}` : ''; const salah = !!tgIso && tgIso > iso(new Date(now.getTime() + 7 * 864e5)) // tanggal jauh di masa depan = salah ketik di sheet, diabaikan
    if (tg && !salah) ref = tgIso
    const isi = [cPem, cTb, cMuat, cLay, cEta, cBon, cKep, cKet, cRev].some(c => c >= 0 && up(r[c]))
    if (!isi && !tg) return // slot kosong yang belum dipakai
    const s = kosong(); const lay = parseRentang(r[cLay] ?? '', ref), eta = parseRentang(r[cEta] ?? '', lay?.[1] ?? ref)
    const revNo = parseInt(r[cRev] ?? '', 10)
    Object.assign(s, { id: `sheet-${tahun}-${no}`, tahap: 'terbit', nomor: no, tahun, tanggal: tg && !salah ? ref : '', pemohon: cap(up(r[cPem])), tambang: up(r[cTb]), muat: up(r[cMuat]), laycanTeks: up(r[cLay]), laycanMulai: lay?.[0] ?? '', laycanSelesai: lay?.[1] ?? '', etaTeks: up(r[cEta]), etaMulai: eta?.[0] ?? '', etaSelesai: eta?.[1] ?? '', bongkar: up(r[cBon]), pltu: up(r[cBon]), transporter: up(r[cKep]), ketRevisi: up(r[cKet]), alasan: alasanDari(up(r[cKet])), sumber: 'sheet-2026', dibuat: today, diubah: today })
    if (revNo) { s.sebelumnyaNomor = revNo; s.revisiKe = 1 } else if (up(r[cKet])) s.revisiKe = 1
    out.push(s)
  }); return out
}
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s
function csvRows(t: string) { const R: string[][] = []; let r: string[] = [], c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++ } else q = false } else c += ch } else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = '' } else if (ch === '\n') { r.push(c.replace(/\r$/, '')); R.push(r); r = []; c = '' } else c += ch } if (c || r.length) { r.push(c); R.push(r) } return R }
type DB = { n: number; y: number; d: string; rk: number; sn: string; kr: string; sk: 'FOB' | 'CIF' | 'Freight'; mi: string; ko: string; tr: string; kt: string; tb: string; kp: string; md: string; vo: number | null; jt: string; pl: string; cs: string; nt: string; l1: string; l2: string; lt: string; e1: string; e2: string; et: string }
export function dariDatabas(rows: DB[], now = new Date()): SI[] {
  const today = iso(now)
  return rows.map(r => { const s = kosong(); const sn = parseInt(r.sn, 10)
    return Object.assign(s, { id: `db-${r.y}-${r.n}-${r.rk}`, tahap: 'terbit' as const, nomor: r.n, tahun: r.y, tanggal: r.d, skema: r.sk, mitra: r.mi, kontrak: r.ko, transporter: r.tr, kontrakTransport: r.kt, tambang: r.tb, kapal: r.kp, moda: r.md, volume: r.vo, muat: r.jt, laycanMulai: r.l1, laycanSelesai: r.l2 || r.l1, laycanTeks: r.lt, etaMulai: r.e1, etaSelesai: r.e2 || r.e1, etaTeks: r.et, pltu: r.pl, consignee: r.cs, notify: r.nt, bongkar: r.pl, revisiKe: r.rk, sebelumnyaNomor: sn || null, ketRevisi: r.kr, alasan: alasanDari(r.kr), sumber: 'databas' as const, dibuat: today, diubah: today })
  })
}
/** Gabung: Databas = arsip rinci (≤ nomor terbaru di sana); sheet 2026 menambah nomor yang belum ada di Databas. */
export function gabung(db: SI[], sheet: SI[]): SI[] { const have = new Set(db.map(r => r.tahun + ':' + r.nomor)); return [...db, ...sheet.filter(r => !have.has(r.tahun + ':' + r.nomor))] }
