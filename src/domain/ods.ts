import Papa from 'papaparse'
/** Sheet "Hutang Tagihan Transportasi" (dipublikasikan): tab Executive Summary 2026 + tab Hutang Transport 2026 (baris dokumen). */
export const ODS_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmENdAo_CD1AmX0Zd_jRPu1s7FThVKocq0HbHv1VjDbyxbs6sXRRXKu-kj2qQ9c_TYX5jWYC92OYrm/pub'
export const ODS_ES_URL = ODS_BASE + '?gid=1890455633&single=true&output=csv'
export const ODS_DOC_URL = ODS_BASE + '?gid=1490351299&single=true&output=csv'
export const ODS_SHEET_LINK = ODS_BASE + 'html'
export type OdsMitra = { m: string; n2: number; n3: number; n4: number; b: number; o1: number; o2: number; t: number; dokN4: number; dokN3: number }
export type OdsDoc = { si: string; jenis: string; termin: string; kapal: string; tujuan: string; invoice: string; tglInv: string; mitra: string; proses: string; nilai: number; due: string; lamaOd: number | null; ket: string; umur: string }
const rp = (s: unknown) => { const v = String(s ?? '').replace(/[^0-9-]/g, ''); return v ? parseInt(v, 10) : 0 }
const c = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** Executive Summary: baris mulai setelah judul kolom "Mitra", berhenti di TOTAL. Kolom: Mitra, N2, N3, N4, belum overdue, <30, >30, total, dok N4, dok N3. */
export function parseOdsEs(text: string): OdsMitra[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => r.some(x => c(x) === 'Mitra')); if (hi < 0) return []
  const k = all[hi].findIndex(x => c(x) === 'Mitra'); const out: OdsMitra[] = []
  for (const r of all.slice(hi + 1)) { const m = c(r[k]); if (!m) continue; if (/^total$/i.test(m)) break
    out.push({ m, n2: rp(r[k + 1]), n3: rp(r[k + 2]), n4: rp(r[k + 3]), b: rp(r[k + 4]), o1: rp(r[k + 5]), o2: rp(r[k + 6]), t: rp(r[k + 7]), dokN4: rp(r[k + 8]), dokN3: rp(r[k + 9]) }) }
  return out
}
/** Baris dokumen tagihan (judul kolom "NO SI"). Proses BBN: 2 konfirmasi email/belum invoice, 3 verifikasi/revisi, 4 siap bayar, 5 sudah dibayar. */
export function parseOdsDocs(text: string): OdsDoc[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => /^NO SI$/i.test(c(r[0]))); if (hi < 0) return []
  const H = all[hi].map(x => c(x).toUpperCase()); const f = (re: RegExp, d: number) => { const i = H.findIndex(h => re.test(h)); return i >= 0 ? i : d }
  const k = { si: f(/^NO SI/, 0), jenis: f(/^JENIS TAGIHAN/, 1), termin: f(/^TERMIN/, 2), kapal: f(/^NAMA KAPAL/, 4), tujuan: f(/^TUJUAN/, 7), inv: f(/^NO\. ?INVOICE/, 8), tgl: f(/^TGL INVOICE/, 9), mitra: f(/^MITRA$/, 11), proses: f(/^PROSES BBN/, 14), nilai: f(/^NILAI TAGIHAN/, 15), due: f(/DUE DATE/, 24), lama: f(/^LAMA OVER/, 26), ket: f(/^KETERANGAN$/, 27), umur: f(/^KLASIFIKASI UMUR/, 29) }
  const out: OdsDoc[] = []
  for (const r of all.slice(hi + 1)) { const mitra = c(r[k.mitra]).toUpperCase(); if (!mitra) continue
    const lama = c(r[k.lama]).replace(/[^0-9-]/g, '')
    out.push({ si: c(r[k.si]), jenis: c(r[k.jenis]), termin: c(r[k.termin]), kapal: c(r[k.kapal]), tujuan: c(r[k.tujuan]), invoice: c(r[k.inv]), tglInv: c(r[k.tgl]), mitra, proses: c(r[k.proses]), nilai: rp(r[k.nilai]), due: c(r[k.due]), lamaOd: lama ? +lama : null, ket: c(r[k.ket]), umur: c(r[k.umur]) }) }
  return out
}
export const PROSES: Record<string, string> = { '2': 'Konfirmasi email (N2)', '3': 'Verifikasi dokumen (N3)', '4': 'Siap bayar (N4)', '5': 'Sudah dibayar' }
/** Umur dokumen N4 mengikuti teks Keterangan (sama dengan dashboard rujukan): "overdue > ..." / "overdue < ...". */
export const umurN4 = (d: OdsDoc) => { const t = d.ket.toLowerCase(); return !t.includes('overdue') ? 'belum' : t.includes('>') ? 'o2' : t.includes('<') ? 'o1' : 'belum' }
export function hitungDok(docs: OdsDoc[]) {
  const C: Record<string, { n2: number; n3: number; n4: number; d1: number; d2: number }> = {}
  for (const d of docs) { const s = d.proses; if (!['2', '3', '4'].includes(s)) continue; const x = (C[d.mitra] ??= { n2: 0, n3: 0, n4: 0, d1: 0, d2: 0 }); if (s === '2') x.n2++; else if (s === '3') x.n3++; else { x.n4++; const u = umurN4(d); if (u === 'o1') x.d1++; else if (u === 'o2') x.d2++ } }
  return C
}
