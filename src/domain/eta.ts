export type Cmp = 1 | 6 | 8 | 9
export const CMP_LABEL: Record<Cmp, string> = { 1: 'TA POL (tiba di pelabuhan muat)', 6: 'TA PLTU (tiba di PLTU)', 8: 'Mulai bongkar', 9: 'Selesai bongkar' }
const RANK = ['terjadwal', 'loading', 'sailing', 'tiba', 'bongkar', 'unloading']; const NEED: Record<Cmp, number> = { 1: 1, 6: 3, 8: 4, 9: 5 }
const day = (t: number) => Math.floor(t / 864e5)
/** Selisih hari antara tanggal aktual dan ETA Rakor (positif = lebih lambat). Tanpa tanggal aktual: bila sudah lewat ETA dan tahap belum sampai, dihitung "lewat ETA". */
export function etaDelay(s: { eta: number | null; ms: (number | null)[]; stage: string | null }, cmp: Cmp, ref: number) {
  if (s.eta == null) return { kind: 'tanpa-eta' as const, days: null as number | null }
  const act = s.ms[cmp]; if (act != null) return { kind: 'aktual' as const, days: day(act) - day(s.eta) }
  if (s.stage && RANK.indexOf(s.stage) >= NEED[cmp]) return { kind: 'tanpa-aktual' as const, days: null }
  const o = day(ref) - day(s.eta); return o > 0 ? { kind: 'lewat-eta' as const, days: o } : { kind: 'belum' as const, days: null }
}
export type EtaHist = Record<string, [string, string][]>
/** Riwayat ETA per shipment (hanya yang punya No. SI): satu entri baru setiap kali ETA berubah; jalan ulang di hari yang sama menimpa entri hari itu. */
export function updateEtaHistory(hist: EtaHist, ships: { id: string; si: string; eta: number | null }[], date: string): EtaHist {
  const cur = new Map<string, string>(); for (const s of ships) if (s.si && s.eta != null) cur.set(s.id, new Date(s.eta).toISOString().slice(0, 10))
  for (const [id, e] of cur) { const a = (hist[id] ??= []); const last = a[a.length - 1]; if (last && last[0] === date) last[1] = e; else if (!last || last[1] !== e) a.push([date, e]) }
  return hist
}
