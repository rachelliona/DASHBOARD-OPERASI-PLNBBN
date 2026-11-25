import Papa from 'papaparse'
import { parseIdNumber } from './format'
import { parseDT, plantName } from './monthly'
export const DAY = 864e5
export type QShip = { plant: string; mitra: string; transport: string; skema: string; tbbg: string; sumber: string; jetty: string; si: string; status: string; bl: number | null; ds: number | null; taPltu: number | null; selesaiBongkar: number | null; coaBongkarTgl: number | null; gcvL: number | null; gcvU: number | null; tmL: number | null; tmU: number | null; ashL: number | null; ashU: number | null; tsL: number | null; tsU: number | null; hgiL: number | null; hgiU: number | null; idtL: number | null; idtU: number | null; turun: number | null }
const hn = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim()
const rng = (n: number | null, a: number, b: number) => n != null && n >= a && n <= b ? n : null
/** ALL Shipment berisi banyak blok dengan baris judul sendiri-sendiri (kolom bisa beda): tiap blok dibaca dengan judulnya sendiri. */
export function parseKualitas(text: string): QShip[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const heads = all.map((r, i) => (hn(r[0]) === 'PLTU' ? i : -1)).filter(i => i >= 0); const out: QShip[] = []
  heads.forEach((hi, bi) => {
    const H = all[hi].map(hn); const f = (re: RegExp) => H.findIndex(c => re.test(c)); const end = bi + 1 < heads.length ? heads[bi + 1] : all.length
    const c = { mitra: f(/^Mitra Real/), tr: f(/^Mitra Transport/), skema: f(/^Skema/), tbbg: f(/^TB\/BG/), sumber: f(/^Sumber Tambang/), jetty: f(/^Jetty/), si: f(/^No\. ?SI/), status: f(/^Status$/), bl: f(/^B\/L$/), ds: f(/^D\/S$/), ta: f(/^TA PLTU/), cu: f(/^Complete ?Unloading/), coa: f(/^Tanggal COA Tebit|^Tanggal Terbit COA Bongkar/),
      gl: f(/^GCV \(Load\)/), tl: f(/^TM \(Load\)/), al: f(/^Ash \(Load\)/), sl: f(/^TS \(Load\)/), hl: f(/^HGI \(Load\)/), il: f(/^IDT \(Load\)/), iu: f(/^IDT \(Unload\)/), gu: f(/^GCV \(Unload\)/), tu: f(/^TM \(Unload\)/), au: f(/^Ash \(Unload\)/), su: f(/^TS \(Unload\)/), hu: f(/^HGI \(Unload\)/) }
    if (c.gl < 0 && c.gu < 0 && c.cu < 0) return
    for (const r of all.slice(hi + 1, end)) {
      const nm = hn(r[0] ?? ''); if (!nm || /^(subtotal|total|loading|unloading|pltu)/i.test(nm)) continue
      const s = (i: number) => (i >= 0 ? hn(r[i] ?? '') : ''); const n = (i: number) => (i >= 0 ? parseIdNumber(r[i]) : null)
      const gcvL = rng(n(c.gl), 2000, 8000), gcvU = rng(n(c.gu), 2000, 8000); const bl = n(c.bl), ds = n(c.ds)
      if (bl == null && ds == null && gcvL == null && gcvU == null) continue
      out.push({ plant: plantName(nm), mitra: s(c.mitra), transport: s(c.tr), skema: s(c.skema), tbbg: s(c.tbbg), sumber: s(c.sumber).replace(/^#.*/, ''), jetty: s(c.jetty).replace(/^#.*/, ''), si: s(c.si), status: s(c.status), bl, ds, taPltu: c.ta >= 0 ? parseDT(r[c.ta]) : null, selesaiBongkar: c.cu >= 0 ? parseDT(r[c.cu]) : null, coaBongkarTgl: c.coa >= 0 ? parseDT(r[c.coa]) : null,
        gcvL, gcvU, tmL: rng(n(c.tl), 0, 70), tmU: rng(n(c.tu), 0, 70), ashL: rng(n(c.al), 0, 50), ashU: rng(n(c.au), 0, 50), tsL: rng(n(c.sl), 0, 10), tsU: rng(n(c.su), 0, 10), hgiL: rng(n(c.hl), 20, 120), hgiU: rng(n(c.hu), 20, 120), idtL: rng(n(c.il), 900, 1600), idtU: rng(n(c.iu), 900, 1600), turun: gcvL != null && gcvU != null ? gcvL - gcvU : null })
    }
  })
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
