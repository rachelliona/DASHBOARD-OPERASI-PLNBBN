import Papa from 'papaparse'
import { parseDT, plantName } from './monthly'
export const DAY = 864e5
export type QShip = { plant: string; mitra: string; transport: string; skema: string; tbbg: string; sumber: string; jetty: string; si: string; status: string; bl: number | null; ds: number | null; taPltu: number | null; selesaiBongkar: number | null; coaBongkarTgl: number | null; gcvL: number | null; gcvU: number | null; tmL: number | null; tmU: number | null; ashL: number | null; ashU: number | null; tsL: number | null; tsU: number | null; hgiL: number | null; hgiU: number | null; idtL: number | null; idtU: number | null; turun: number | null
  hasQ: boolean; umpFlag: boolean; umpDone: boolean; siTok: string[]; konf: string }
const hn = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const num = (v: unknown) => { let s = String(v ?? '').trim(); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = parseFloat(s); return isNaN(n) ? null : n }
const H0: Record<string, number> = { 'pltu': 0, 'konfirmasi': 1, 'mitra konf.': 9, 'mitra real.': 10, 'tb/bg': 13, 'skema': 14, 'status': 15, 'mitra transport': 18, 'no. si': 20, 'sumber tambang': 25, 'jetty': 26, 'b/l': 33, 'd/s': 34, 'ta pltu': 35, 'complete unloading': 38, 'gcv (load)': 43, 'tanggal coa tebit': 59, 'umpire': 69, 'parameter uji': 70, 'tanggal verifikasi': 71, 'tanggal pelaksanaan': 72, 'gcv (ump.)': 74, 'tm (ump.)': 75, 'ash (ump.)': 76, 'ts (ump.)': 77 }
const BULAN: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 }
/** 8 nilai mutu berurutan (GCV, TM, Ash, TS, HGI, IDT, 70mm, 2,38mm) mulai kolom s; sah bila GCV/TM/Ash/TS dalam rentang wajar. */
function qblk(r: string[], s: number) { const v: (number | null)[] = []; for (let i = 0; i < 8; i++) v.push(num(r[s + i])); const ok = (x: number | null, lo: number, hi: number) => x != null && x >= lo && x <= hi
  return ok(v[0], 2500, 7000) && ok(v[1], 3, 60) && ok(v[2], 0, 45) && ok(v[3], 0, 8) ? v : null }
function siTokens(r: string[]) { for (let j = 16; j <= 22; j++) { const v = hn(r[j]).replace(/\s+/g, ''); if (/^\d{3,4}([;&,]\d{3,4})*$/.test(v)) return v.split(/[;&,]/).map(x => String(parseInt(x, 10))) } return [] }
const tgl = (s: string, y0 = 2026) => { const m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/); if (!m) return null; let y = m[3] ? +m[3] : y0; if (y < 100) y += 2000; return Date.UTC(y, +m[2] - 1, +m[1]) }
/** Sheet Data Kualitas / ALL Shipment: blok berulang dengan judul "PLTU". Kolom mutu dicari dari posisinya (kolom 40–59) karena sebagian baris bergeser,
 *  persis seperti dashboard Monitoring Kualitas. Baris tanpa COA tetap disimpan (hasQ=false) untuk pemantauan COA bongkar. */
export function parseKualitas(text: string): QShip[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]; const out: QShip[] = []; let H = { ...H0 }
  for (const r of all) {
    if (!r || !r.length) continue; const first = hn(r[0])
    if (first === 'PLTU' || /\bPLTU$/.test(first)) { H = { ...H0 }; const seen: Record<string, number> = {}; r.forEach((c, i) => { const k = hn(c).toLowerCase().replace(/^.*\bpltu$/, 'pltu'); if (!k) return; if (seen[k] == null) { seen[k] = i; H[k] = i } else if (H[k + '#2'] == null) H[k + '#2'] = i }); continue }
    if (!first || /^(subtotal|total)$/i.test(first)) continue
    let k = -1, L8: (number | null)[] | null = null, U8: (number | null)[] | null = null
    for (let s = 40; s < 50; s++) { const a = qblk(r, s), b = qblk(r, s + 8); if (a && b) { k = s; L8 = a; U8 = b; break } }
    if (k < 0) for (let s = 48; s < 60; s++) { const b = qblk(r, s); if (b) { k = s - 8; U8 = b; break } }
    const d = k >= 0 ? k - (H['gcv (load)'] ?? 43) : 0, at = (key: string) => H[key] == null ? -1 : H[key] + d, g = (i: number) => (i >= 0 ? hn(r[i]) : '')
    const tb = g(H['tb/bg']), parts = tb.replace(/^\d+\s*-\s*/, '').split(';'), note = (parts[1] || '').trim(), konf = g(H['konfirmasi'])
    let bl = num(r[at('b/l')]), ds = num(r[at('d/s')]); if (bl == null || bl < 500 || bl > 60000) bl = null; if (ds == null || ds < 500 || ds > 60000) ds = null
    if (k >= 0 && (bl == null || ds == null)) for (let j = k - 14; j <= k - 6; j++) { const a = num(r[j]), b = num(r[j + 1]); if (String(r[j] ?? '').includes(',') && a != null && b != null && a >= 500 && a <= 60000 && b >= 500 && b <= 60000 && Math.abs(a - b) / a < 0.05) { bl = a; ds = b; break } }
    const cu = g(at('complete unloading')); let sb = Math.abs(d) < 2 ? tgl(cu) : null; if (sb == null && /unl/i.test(note)) sb = tgl(note)
    if (sb != null) { const y = new Date(sb).getUTCFullYear(); if (y < 2025 || y > 2027) sb = null }
    const umpTxt = g(at('umpire')), uji = g(at('parameter uji')), tp = g(at('tanggal pelaksanaan')), ver = g(at('tanggal verifikasi'))
    const umpDone = ['gcv (ump.)', 'tm (ump.)', 'ash (ump.)', 'ts (ump.)'].some(x => num(r[at(x)]) != null || num(r[at(x + '#2')]) != null) || !!tp
    const umpFlag = (!!umpTxt && !/^(tidak|no|false|-|0)$/i.test(umpTxt)) || !!uji || !!ver || umpDone
    const L = (i: number) => (L8 ? L8[i] : null), U = (i: number) => (U8 ? U8[i] : null)
    const bad = (v: number | null, lo: number, hi: number) => v != null && v >= lo && v <= hi ? v : null
    const ship: QShip = { plant: plantName(first), mitra: g(H['mitra real.']) || g(H['mitra konf.']) || '(tidak tercatat)', transport: g(H['mitra transport']), skema: g(H['skema']), tbbg: parts[0].trim().replace(/\s*\/\s*/g, ' / '), sumber: g(H['sumber tambang']).replace(/^#.*/, ''), jetty: g(H['jetty']).replace(/^#.*/, ''), si: g(H['no. si']), status: g(H['status']),
      bl, ds, taPltu: Math.abs(d) < 2 ? parseDT(r[at('ta pltu')]) : null, selesaiBongkar: sb, coaBongkarTgl: null, gcvL: L(0), gcvU: U(0), tmL: L(1), tmU: U(1), ashL: L(2), ashU: U(2), tsL: L(3), tsU: U(3), hgiL: bad(L(4), 20, 120), hgiU: bad(U(4), 20, 120), idtL: bad(L(5), 900, 1600), idtU: bad(U(5), 900, 1600),
      turun: L8 && U8 && L8[0] != null && U8[0] != null ? L8[0] - U8[0] : null, hasQ: k >= 0, umpFlag, umpDone, siTok: siTokens(r), konf: BULAN[konf.toLowerCase()] ? konf : konf }
    if (!ship.hasQ && bl == null && ds == null && !ship.siTok.length) continue
    out.push(ship)
  }
  return out
}
export type CoaStat = 'ada' | 'jendela' | 'telat' | 'belum' | 'nodata'
/** CoA bongkar: dianggap ada bila GCV unload terisi. Jendela pengisian = H-2 s.d. H+7 dari tanggal selesai bongkar. */
export function coaStatus(s: QShip, today: number): CoaStat {
  if (s.gcvU != null || s.coaBongkarTgl != null) return 'ada'
  if (s.selesaiBongkar == null) return 'nodata'
  const d = Math.floor((today - s.selesaiBongkar) / DAY)
  return d < -2 ? 'belum' : d <= 7 ? 'jendela' : 'telat'
}
export const hariSejak = (s: QShip, today: number) => s.selesaiBongkar == null ? null : Math.floor((today - s.selesaiBongkar) / DAY)
/** Skor mutu per shipment dari susut GCV muat->bongkar (kcal/kg). Asumsi: ambang dapat diubah di sini. */
export const skorMutu = (turun: number | null) => turun == null ? null : turun <= 50 ? 100 : turun <= 100 ? 95 : turun <= 150 ? 90 : turun <= 250 ? 75 : 50
export const avg = (a: (number | null)[]) => { const v = a.filter((x): x is number => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null }
