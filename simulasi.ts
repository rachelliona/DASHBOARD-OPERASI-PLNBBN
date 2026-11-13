import { Ship, STEPS, pctl, regionOf, stepDays } from './monthly'
import { norm } from './status'

/** Simulasi estimasi tanggal shipment dari durasi historis tiap tahap.
 *  Tahap i = selisih milestone i -> i+1 (lihat STEPS). Milestone: 0 SI, 1 TA POL, 2 Sandar muat, 3 Mulai muat, 4 Selesai muat, 5 Berlayar, 6 TA PLTU, 7 Sandar bongkar, 8 Mulai bongkar, 9 Selesai bongkar.
 *  Rentang cepat/lambat berasal dari kuartil historis (bukan jaminan); hasilnya perkiraan statistik, bukan janji jadwal. */
export const MILESTONES = ['Tgl. SI terbit', 'Tiba di pelabuhan muat (TA POL)', 'Sandar muat', 'Mulai muat', 'Selesai muat', 'Berlayar', 'Tiba di PLTU (TA PLTU)', 'Sandar bongkar', 'Mulai bongkar', 'Selesai bongkar']
export const DAY = 864e5
export const MIN_N = 5
export type Sel = { plant?: string; sumber?: string; jetty?: string }
export type StepStat = { i: number; med: number | null; p25: number | null; p75: number | null; n: number; scope: string }
type Rung = { label: string; f: (s: Ship) => boolean }
const eq = (a: string, b: string) => norm(a) === norm(b)

/** Urutan cakupan dari paling spesifik ke paling umum; hanya anak tangga yang sesuai pilihan pengguna. */
export function ladder(sel: Sel): Rung[] {
  const P = (s: Ship) => !!sel.plant && eq(s.plant, sel.plant), S = (s: Ship) => !!sel.sumber && eq(s.sumber, sel.sumber), J = (s: Ship) => !!sel.jetty && eq(s.jetty, sel.jetty)
  const r: Rung[] = []
  if (sel.sumber && sel.jetty && sel.plant) r.push({ label: 'sumber + jetty + PLTU', f: s => S(s) && J(s) && P(s) })
  if (sel.jetty && sel.plant) r.push({ label: 'rute jetty → PLTU', f: s => J(s) && P(s) })
  if (sel.sumber && sel.plant) r.push({ label: 'sumber → PLTU', f: s => S(s) && P(s) })
  if (sel.plant) r.push({ label: 'PLTU tujuan', f: P })
  if (sel.jetty) r.push({ label: 'jetty muat', f: J })
  if (sel.sumber) r.push({ label: 'sumber tambang', f: S })
  const rg = sel.plant ? regionOf(sel.plant) : null
  if (rg) r.push({ label: `wilayah ${rg}`, f: s => regionOf(s.plant) === rg })
  r.push({ label: 'seluruh shipment', f: () => true })
  return r
}

/** Statistik durasi per tahap; tiap tahap memakai cakupan paling spesifik yang punya >= MIN_N sampel. */
export function stepStatsFor(ships: Ship[], sel: Sel): StepStat[] {
  const D = ships.map(s => ({ s, d: stepDays(s.ms) })); const rungs = ladder(sel)
  return STEPS.map((_, i) => {
    let fallback: StepStat | null = null
    for (const r of rungs) {
      const v = D.filter(x => r.f(x.s) && x.d[i] != null).map(x => x.d[i] as number).sort((a, b) => a - b)
      if (!v.length) continue
      const st: StepStat = { i, med: pctl(v, .5), p25: pctl(v, .25), p75: pctl(v, .75), n: v.length, scope: r.label }
      if (v.length >= MIN_N) return st
      fallback ??= st
    }
    return fallback ?? { i, med: null, p25: null, p75: null, n: 0, scope: '—' }
  })
}

export type Pred = { i: number; known: boolean; date: number | null; lo: number | null; hi: number | null; tertahan?: boolean; dir?: 'maju' | 'mundur' | 'isi' }
/** known = 10 tanggal milestone (null bila belum diketahui). Prediksi dihitung dari milestone terakhir yang diketahui.
 *  adj[i] = tambahan (atau pengurangan) hari pada tahap i (skenario). Rentang = tengah ∓ akar jumlah kuadrat sebaran kuartil (tahap dianggap saling bebas). */
export function predict(known: (number | null)[], stats: StepStat[], adj: number[], today: number): Pred[] {
  let a = -1; known.forEach((v, i) => { if (v != null) a = i })
  const out: Pred[] = known.map((v, i) => ({ i, known: v != null, date: v, lo: v, hi: v }))
  if (a < 0) return out.map(p => ({ ...p, date: null, lo: null, hi: null }))
  let mid = known[a] as number, vl = 0, vh = 0, broken = false
  for (let k = a; k < 9; k++) {
    const st = stats[k]; const p = out[k + 1]; if (p.known) { mid = p.date as number; vl = 0; vh = 0; continue }
    if (broken || st.med == null) { broken = true; p.date = p.lo = p.hi = null; continue }
    let d = st.med
    if (k === a) { const el = (today - (known[a] as number)) / DAY; if (el > d) { d = el + .5; p.tertahan = true } }
    d = Math.max(0, d + (adj[k] ?? 0)); mid += d * DAY
    vl += ((st.med - (st.p25 ?? st.med))) ** 2; vh += (((st.p75 ?? st.med) - st.med)) ** 2
    p.date = mid; p.lo = mid - Math.sqrt(vl) * DAY; p.hi = mid + Math.sqrt(vh) * DAY; p.dir = 'maju'
  }
  // ke belakang: milestone sebelum tanggal pertama yang diketahui (mis. kapan SI harus terbit agar TA POL jatuh di tanggal itu)
  let f = known.findIndex(v => v != null)
  if (f > 0) {
    let mid = known[f] as number, vl = 0, vh = 0, broken = false
    for (let k = f - 1; k >= 0; k--) {
      const st = stats[k]; const p = out[k]; if (broken || st.med == null) { broken = true; p.date = p.lo = p.hi = null; continue }
      const d = Math.max(0, st.med + (adj[k] ?? 0)); mid -= d * DAY
      vl += (((st.p75 ?? st.med) - st.med)) ** 2; vh += ((st.med - (st.p25 ?? st.med))) ** 2
      p.date = mid; p.lo = mid - Math.sqrt(vl) * DAY; p.hi = mid + Math.sqrt(vh) * DAY; p.dir = 'mundur'
    }
  }
  // celah di antara dua tanggal yang diisi: dibagi sebanding median tiap tahap
  const idx = known.map((v, i) => v != null ? i : -1).filter(i => i >= 0)
  for (let q = 0; q + 1 < idx.length; q++) {
    const i = idx[q], j = idx[q + 1]; if (j - i < 2) continue
    const meds = stats.slice(i, j).map(x => x.med); if (meds.some(m => m == null)) continue
    const tot = (meds as number[]).reduce((x, y) => x + y, 0) || 1; let c = 0
    for (let k = i + 1; k < j; k++) { c += meds[k - i - 1] as number; const t = (known[i] as number) + ((known[j] as number) - (known[i] as number)) * (c / tot); Object.assign(out[k], { date: t, lo: t, hi: t, dir: 'isi' as const }) }
  }
  return out
}

/** Durasi historis total dari milestone a ke b (hari) pada cakupan paling spesifik yang punya >= 8 sampel. */
export function totals(ships: Ship[], sel: Sel, a: number, b: number): { vals: number[]; scope: string } {
  let best: { vals: number[]; scope: string } = { vals: [], scope: '—' }
  for (const r of ladder(sel)) {
    const v = ships.filter(s => r.f(s) && s.ms[a] != null && s.ms[b] != null && (s.ms[b] as number) >= (s.ms[a] as number)).map(s => ((s.ms[b] as number) - (s.ms[a] as number)) / DAY).sort((x, y) => x - y)
    if (v.length >= 8) return { vals: v, scope: r.label }
    if (v.length > best.vals.length) best = { vals: v, scope: r.label }
  }
  return best
}
/** Peluang (empiris) sampai paling lambat `days` hari sejak milestone a. null bila sampel < 8. */
export const probWithin = (vals: number[], days: number) => vals.length < 8 ? null : vals.filter(x => x <= days).length / vals.length
