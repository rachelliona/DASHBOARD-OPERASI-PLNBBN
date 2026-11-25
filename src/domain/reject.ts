import Papa from 'papaparse'
import { QShip } from './kualitas'
/** Standar Rejection (sheet): batas penolakan per sumber tambang. Reject = nilai CoA bongkar melewati batas. */
export type Std = { k: string; nama: string; gcv: number | null; tm: number | null; ash: number | null; ts: number | null; idt: number | null; hgiLo: number | null; hgiHi: number | null }
export const nk = (s: string) => (s || '').toLowerCase().replace(/\b(pt|cv|tbk|persero)\b/g, '').replace(/[^a-z0-9]/g, '')
const nums = (s: string) => (String(s ?? '').match(/\d+(?:,\d+)?/g) ?? []).map(x => +x.replace(',', '.'))
export function parseStd(text: string): Std[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: true }).data as string[][]; const out: Std[] = []
  for (const r of all) { const nama = (r[3] ?? '').trim(); if (!nama || /^sumber/i.test(nama) || !(r[9] ?? '').trim() || (r[2] ?? '').includes('KOSONG')) continue
    const g = nums(r[9]), t = nums(r[12]), a = nums(r[15]), s = nums(r[18]), i = nums(r[21]), h = nums(r[24]); const hl = /<\s*(\d+(?:,\d+)?)/.exec(r[24] ?? ''), hh = />\s*(\d+(?:,\d+)?)/.exec(r[24] ?? '')
    out.push({ k: nk(nama), nama, gcv: g.length ? Math.min(...g) : null, tm: t[0] ?? null, ash: a[0] ?? null, ts: s[0] ?? null, idt: i[0] ?? null, hgiLo: hl ? +hl[1].replace(',', '.') : (h.length === 1 && /</.test(r[24] ?? '') ? h[0] : null), hgiHi: hh ? +hh[1].replace(',', '.') : null }) }
  return out
}
export const cariStd = (std: Std[], sumber: string) => { const k = nk(sumber); if (!k) return null; return std.find(x => x.k === k) ?? std.find(x => x.k.length > 3 && (k.includes(x.k) || x.k.includes(k))) ?? null }
export type Lang = { p: string; v: number; batas: number }
function cek(g: number | null, tm: number | null, ash: number | null, ts: number | null, hgi: number | null, idt: number | null, d: Std): Lang[] {
  const o: Lang[] = []
  if (g != null && d.gcv != null && g < d.gcv) o.push({ p: 'GCV (GAR)', v: g, batas: d.gcv }); if (tm != null && d.tm != null && tm > d.tm) o.push({ p: 'Total moisture', v: tm, batas: d.tm })
  if (ash != null && d.ash != null && ash > d.ash) o.push({ p: 'Ash', v: ash, batas: d.ash }); if (ts != null && d.ts != null && ts > d.ts) o.push({ p: 'Total sulfur', v: ts, batas: d.ts })
  if (idt != null && d.idt != null && idt < d.idt) o.push({ p: 'IDT', v: idt, batas: d.idt }); if (hgi != null && ((d.hgiLo != null && hgi < d.hgiLo) || (d.hgiHi != null && hgi > d.hgiHi))) o.push({ p: 'HGI', v: hgi, batas: d.hgiLo ?? d.hgiHi! })
  return o
}
/** null = tidak dinilai (tanpa CoA bongkar atau tanpa standar). */
export function nilai(s: QShip, std: Std[]) {
  const d = cariStd(std, s.sumber); if (!d || (s.gcvU == null && s.tmU == null && s.ashU == null && s.tsU == null)) return null
  const bongkar = cek(s.gcvU, s.tmU, s.ashU, s.tsU, s.hgiU, s.idtU, d), muat = cek(s.gcvL, s.tmL, s.ashL, s.tsL, s.hgiL, s.idtL, d)
  return { reject: bongkar.length > 0, bongkar, umpire: bongkar.length > 0 && muat.length === 0 && s.gcvL != null, std: d }
}
