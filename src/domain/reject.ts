import Papa from 'papaparse'
import { QShip } from './kualitas'
/** Batas reject per Mitra Real. (kode, mis. BIB, JG) dari tab "DATA REJECT DAN TYPICAL BATUBARA" di spreadsheet Data Kualitas.
 *  Sama dengan dashboard Monitoring Kualitas: reject bila hasil COA BONGKAR melewati batas (GCV < min, TM/Ash/TS > maks). */
export type Std = { k: string; nama: string; gcv: number | null; tm: number | null; ash: number | null; ts: number | null; idt: number | null; hgiLo: number | null; hgiHi: number | null }
export const KUALITAS_ID = '1z0ZN3m4FzztY5J0x2RtJmSs7dQ1zYkd1xvLZOKeUhZw'
export const SPEC_URL = `https://docs.google.com/spreadsheets/d/${KUALITAS_ID}/export?format=csv&gid=988344384`
export const DATA_URL = `https://docs.google.com/spreadsheets/d/${KUALITAS_ID}/export?format=csv&gid=0`
const num = (v: unknown) => { let s = String(v ?? '').trim(); if (!s) return null; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = parseFloat(s); return isNaN(n) ? null : n }
const kunci = (s: string) => String(s || '').trim().toUpperCase()
/** Cadangan bila sheet batas tidak terbaca (salinan dari dashboard Monitoring Kualitas). */
const CADANGAN = 'JG,3600,42,8,0.5|TA,3600,44,8,0.5|FSP,4000,39,7,0.45|BKPL,3900,37,6,0.5|BIB,3900,37,6,0.35|AGM,3600,42,6,0.4|BSSR,3600,42,6,0.7|SSC,5300,16,20,1.1|STC,5200,17,26,1|MME,4200,35,6,0.4|BAR,4000,38,6.5,0.5|MIFA,3200,48,8,0.6|BEL,3200,48,8,0.6|IPE,3000,47,10,0.7|CEP,3600,42,6,0.7|AJB,3000,47,10,0.7|Cycle 10,4300,36,6.5,0.8|ABAP,4000,37,7,0.4|BBS,4400,35,8,1.5|SBM,5200,24,9,1.5|SWE,4500,33,7,0.7|SPE,4450,33,7,0.7|GAJ,3700,38,7,0.5|TJ,3600,42,6.5,0.7|SSE,4000,37,6,0.7|ATM,3500,41,9,0.6|TBC,4400,35,8,1.5|TRI,4400,35,8,1.5|CBF,4400,36,9,1.5|KJA,4000,38,6,0.4'
export const STD_CADANGAN: Std[] = CADANGAN.split('|').map(x => { const [m, g, t, a, s] = x.split(','); return { k: kunci(m), nama: m, gcv: +g, tm: +t, ash: +a, ts: +s, idt: null, hgiLo: null, hgiHi: null } })
export function parseStd(text: string): Std[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => /^mitra/i.test(String(r[0] ?? '').trim())); if (hi < 0) return []
  const out: Std[] = []
  for (const r of all.slice(hi + 1)) { const m = String(r[0] ?? '').trim(); if (!m) continue; const g = num(r[1]), t = num(r[2]), a = num(r[3]), s = num(r[4]); if (g == null || t == null || a == null || s == null) continue
    const hg = String(r[5] ?? ''), lo = /<\s*(\d+)/.exec(hg), hh = />\s*(\d+)/.exec(hg), idt = /(\d{3,4})/.exec(String(r[6] ?? ''))
    out.push({ k: kunci(m), nama: m, gcv: g, tm: t, ash: a, ts: s, idt: idt ? +idt[1] : null, hgiLo: lo ? +lo[1] : null, hgiHi: hh ? +hh[1] : null }) }
  return out
}
export const cariStd = (std: Std[], mitra: string) => std.find(x => x.k === kunci(mitra)) ?? null
export type Lang = { p: string; v: number; batas: number }
const P: [string, 'gcvU' | 'tmU' | 'ashU' | 'tsU', 'gcvL' | 'tmL' | 'ashL' | 'tsL', 'gcv' | 'tm' | 'ash' | 'ts', 'min' | 'max'][] = [['GCV (GAR)', 'gcvU', 'gcvL', 'gcv', 'min'], ['Total moisture', 'tmU', 'tmL', 'tm', 'max'], ['Ash', 'ashU', 'ashL', 'ash', 'max'], ['Total sulfur', 'tsU', 'tsL', 'ts', 'max']]
const lewat = (dir: 'min' | 'max', v: number, b: number) => dir === 'min' ? v < b : v > b
/** null = belum dinilai (tanpa COA bongkar atau batas mitra belum ada). Kandidat umpire: parameter yang reject di bongkar ternyata memenuhi di muat. */
export function nilai(s: QShip, std: Std[]) {
  const d = cariStd(std, s.mitra); if (!d || s.gcvU == null) return null
  const bongkar: Lang[] = []; let umpire = false
  for (const [p, u, l, k, dir] of P) { const b = d[k], v = s[u]; if (b == null || v == null || !lewat(dir, v, b)) continue; bongkar.push({ p, v, batas: b }); const lv = s[l]; if (lv != null && !lewat(dir, lv, b)) umpire = true }
  return { reject: bongkar.length > 0, bongkar, umpire, std: d }
}
