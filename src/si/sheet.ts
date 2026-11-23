import { SI, ALASAN } from './types'
import { singkat } from './singkatan'

const TRANSPORT: Record<string, string> = { 'bahtera adhiguna': 'BAG', 'pelayaran bahtera adhiguna': 'BAG', 'adhi guna putera': 'AGP' }
const dmy = (iso: string) => { const [y, m, d] = (iso || '').split('-'); return y && m && d ? `${d}/${m}/${y}` : '' }
const p2 = (n: string) => (n || '').slice(-2)
/** "25-27" (bulan sama dengan tanggal SI) atau "25-27/11"; lintas bulan "30/11-02/12". */
export function rentangSheet(a: string, b: string, tglSI: string, selalu = false): string {
  if (!a) return ''; const [, m1, d1] = a.split('-'), [, m2, d2] = (b || a).split('-'); const bln = (tglSI || '').slice(5, 7)
  if (m1 !== m2) return `${d1}/${m1}-${d2}/${m2}`
  if (d1 === d2) return selalu || m1 !== bln ? `${d1}/${m1}` : d1
  return selalu || m1 !== bln ? `${d1}-${d2}/${m1}` : `${d1}-${d2}`
}
const kataT = (n: string) => n.replace(/^(pt|cv)\.?\s+/i, '').replace(/^pelayaran\s+/i, '').trim().toLowerCase()
export const singkatTransport = (n: string) => { if (!n) return ''; return TRANSPORT[kataT(n)] ?? TRANSPORT[n.trim().toLowerCase()] ?? singkat(n) }
/** Teks pelabuhan muat gaya sheet: pakai kolom POL dari Databas SI bila ada. */
export function muatSheet(muat: string, jetty: string[][]): string {
  const m = (muat || '').trim(); if (!m) return ''
  const hit = jetty.find(j => { const n = j[0].toLowerCase(), l = m.toLowerCase(); return l === n || l === `${n}, ${(j[1] || '').toLowerCase()}` })
  return hit?.[2] ? hit[2] : m
}
export type NilaiSheet = { tanggal: string; pemohon: string; tambang: string; muat: string; laycan: string; eta: string; bongkar: string; kepada: string; rev: string; ketRev: string }
export function nilaiSheet(s: SI, jetty: string[][]): NilaiSheet {
  const kepada = [singkat(s.mitra || s.tambang), s.skema === 'FOB' || s.transporter ? singkatTransport(s.transporter) : ''].filter(Boolean).join(' & ')
  return {
    tanggal: dmy(s.tanggal), pemohon: s.pemohon ? s.pemohon[0].toUpperCase() + s.pemohon.slice(1) : '', tambang: singkat(s.tambang || s.mitra), muat: muatSheet(s.muat, jetty),
    laycan: rentangSheet(s.laycanMulai, s.laycanSelesai, s.tanggal), eta: rentangSheet(s.etaMulai, s.etaSelesai, s.tanggal, true), bongkar: s.pltu || '', kepada,
    rev: s.sebelumnyaNomor != null ? String(s.sebelumnyaNomor) : '', ketRev: s.revisiKe > 0 ? [s.alasan ? ALASAN[s.alasan] : '', s.ketRevisi].filter(Boolean).join(' — ') : '',
  }
}
void p2
