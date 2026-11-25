import { Blok, SI, Ubah } from './types'
export const fmtNomor = (n: number | null, tahun: number, jenis: 'SI' | 'TI' = 'SI') => n == null ? '(belum bernomor)' : `${String(n).padStart(4, '0')}.${jenis}/EPI.03.01/DIR/${tahun}`
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const BULAN_ID = BLN
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const tglId = (s: string) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : s }
/** "17-19 November 2026" / "29 Nov - 2 Des 2026" untuk surat */
export function rentangId(a: string, b: string) {
  if (!a) return ''; if (!b || a === b) return tglId(a)
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number); const z = (n: number) => String(n).padStart(2, '0')
  if (y1 === y2 && m1 === m2) return `${z(d1)}-${z(d2)} ${BLN[m1 - 1]} ${y1}`
  if (y1 === y2) return `${z(d1)} ${BLN[m1 - 1]} - ${z(d2)} ${BLN[m2 - 1]} ${y1}`
  return `${tglId(a)} - ${tglId(b)}`
}
/** Parser laycan teks bebas: "10-12/01", "25-27", "30/11-02/12", "17-19 Nov". refIso = tanggal acuan untuk bulan/tahun yang tidak tertulis. */
export function parseRentang(teks: string, refIso: string): [string, string] | null {
  const t = (teks || '').trim().replace(/\s*(s\/d|sd|s\.d\.?)\s*/gi, '-').replace(/\s+/g, ''); if (!t) return null
  const ref = /^(\d{4})-(\d\d)-(\d\d)/.exec(refIso || ''); const y0 = ref ? +ref[1] : new Date().getFullYear(), m0 = ref ? +ref[2] : new Date().getMonth() + 1
  const mk = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  let m = /^(\d{1,2})\/(\d{1,2})[-–](\d{1,2})\/(\d{1,2})$/.exec(t) // 30/11-02/12
  if (m) { const a = +m[1], am = +m[2], b = +m[3], bm = +m[4]; if (am > 12 || bm > 12 || a > 31 || b > 31) return null; return [mk(y0, am, a), mk(bm < am ? y0 + 1 : y0, bm, b)] }
  m = /^(\d{1,2})[-–](\d{1,2})(?:\/(\d{1,2}))?$/.exec(t) // 10-12/01 | 25-27
  if (m) { const a = +m[1], b = +m[2], mo = m[3] ? +m[3] : m0; if (mo > 12 || a > 31 || b > 31 || a < 1) return null; const wrap = b < a; return [mk(y0, mo, a), mk(wrap && mo === 12 ? y0 + 1 : y0, wrap ? (mo % 12) + 1 : mo, b)] }
  m = /^(\d{1,2})(?:\/(\d{1,2}))?$/.exec(t); if (m) { const mo = m[2] ? +m[2] : m0; if (mo > 12 || +m[1] > 31) return null; return [mk(y0, mo, +m[1]), mk(y0, mo, +m[1])] }
  return null
}
export const hari = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5)

export type Status = 'pengajuan' | 'batal' | 'direvisi' | 'lewat' | 'arsip' | 'segera' | 'aktif' | 'tanpa-laycan'
export const STATUS_LABEL: Record<Status, string> = { pengajuan: 'Pengajuan (belum bernomor)', batal: 'Dibatalkan', direvisi: 'Sudah direvisi', lewat: 'Lewat laycan (≤30 hari)', arsip: 'Laycan lampau (arsip)', segera: 'Laycan ≤ 3 hari', aktif: 'Aktif', 'tanpa-laycan': 'Laycan tak terbaca' }
/** Kumpulan id SI yang sudah digantikan revisi (rantai revisi). */
export function supersededIds(rows: SI[]) { const s = new Set<string>(); const byNo = new Map<string, SI>(); rows.forEach(r => { if (r.nomor != null) byNo.set(r.tahun + ':' + r.nomor, r) }); rows.forEach(r => { if (r.tahap === 'batal') return; if (r.sebelumnyaId) s.add(r.sebelumnyaId); else if (r.sebelumnyaNomor != null) { const p = byNo.get(r.tahun + ':' + r.sebelumnyaNomor) ?? byNo.get(r.tahun - 1 + ':' + r.sebelumnyaNomor); if (p && p.id !== r.id) s.add(p.id) } }); return s }
export function statusOf(r: SI, today: string, sup: Set<string>): Status {
  if (r.tahap === 'pengajuan') return 'pengajuan'; if (r.tahap === 'batal') return 'batal'; if (sup.has(r.id)) return 'direvisi'
  const end = r.laycanSelesai; if (!end) return 'tanpa-laycan'
  if (end < today) return hari(end, today) <= 30 ? 'lewat' : 'arsip'; if (hari(today, r.laycanMulai || end) <= 3) return 'segera'; return 'aktif'
}
export type Masalah = { kind: 'dobel' | 'lompat-mundur' | 'tanggal-mundur'; id: string; teks: string }
/** Deteksi dobel nomor (tahun+nomor sama), nomor tertukar urutan terhadap tanggal, dan celah (diabaikan: celah dipakai surat lain). */
export function periksa(rows: SI[], blok: Blok[] = []): { dobel: Map<string, SI[]>; masalah: Masalah[]; celah: Record<number, number[]> } {
  const g = new Map<string, SI[]>(); rows.filter(r => r.nomor != null && r.tahap !== 'pengajuan').forEach(r => { const k = r.tahun + ':' + r.nomor; g.set(k, [...(g.get(k) ?? []), r]) })
  const dobel = new Map([...g].filter(([, v]) => v.length > 1)); const masalah: Masalah[] = []
  dobel.forEach((v, k) => v.forEach(r => masalah.push({ kind: 'dobel', id: r.id, teks: `Nomor ${k.split(':')[1]}/${k.split(':')[0]} dipakai ${v.length} SI` })))
  const th = [...new Set(rows.map(r => r.tahun))]; const celah: Record<number, number[]> = {}
  th.forEach(y => {
    const used = new Set<number>(); rows.forEach(r => { if (r.tahun === y && r.nomor != null && r.tahap !== 'pengajuan') used.add(r.nomor) }); blok.forEach(b => { if (b.tahun === y) used.add(b.nomor) })
    const mx = Math.max(0, ...used); const gap: number[] = []; for (let n = 1; n <= mx; n++) if (!used.has(n)) gap.push(n); celah[y] = gap
    const s = rows.filter(r => r.tahun === y && r.nomor != null && r.tahap !== 'pengajuan' && r.tanggal && r.sumber !== 'databas').sort((a, b) => a.nomor! - b.nomor!)
    let maxD = ''; s.forEach(r => { if (maxD && r.tanggal < maxD) masalah.push({ kind: 'tanggal-mundur', id: r.id, teks: `Nomor ${r.nomor} bertanggal ${r.tanggal}, lebih awal dari nomor sebelumnya (${maxD}) — nomor mundur/backdate?` }); if (r.tanggal > maxD) maxD = r.tanggal })
  })
  return { dobel, masalah, celah }
}
/** Nomor berikutnya = terbesar yang pernah dipakai/diblok pada tahun itu + 1 (tidak mengisi celah: celah = nomor surat lain Dirop). */
export function nomorBerikut(rows: SI[], blok: Blok[], tahun: number) {
  let mx = 0; rows.forEach(r => { if (r.tahun === tahun && r.nomor != null && r.tahap !== 'pengajuan' && r.nomor > mx) mx = r.nomor }); blok.forEach(b => { if (b.tahun === tahun && b.nomor > mx) mx = b.nomor }); return mx + 1
}
export const isCad = (b: Blok) => /^cadangan/i.test(b.ket || '')
export const nomorDipakai = (rows: SI[], blok: Blok[], tahun: number, n: number, kecualiId = '') => rows.find(r => r.id !== kecualiId && r.tahun === tahun && r.nomor === n && r.tahap !== 'pengajuan') ?? (blok.find(b => b.tahun === tahun && b.nomor === n && !isCad(b)) ? ({ id: 'blok' } as SI) : undefined)
/** Rantai revisi dari SI awal sampai terbaru. */
export function rantai(rows: SI[], r: SI) { const by = new Map(rows.map(x => [x.id, x])); const out: SI[] = [r]; let c = r, g = 0; while (c.sebelumnyaId && by.has(c.sebelumnyaId) && g++ < 50) { c = by.get(c.sebelumnyaId)!; out.unshift(c) } c = r; g = 0; for (;;) { const nx = rows.find(x => x.sebelumnyaId === c.id && x.tahap !== 'batal'); if (!nx || g++ > 50) break; out.push(nx); c = nx } return out }

/** Field yang dibandingkan antara dua versi SI. `penting` = perubahan bermakna (wajib Revisi), bukan sekadar typo. */
export const FIELDS: { f: keyof SI; label: string; penting: boolean }[] = [
  { f: 'mitra', label: 'Shipper / mitra', penting: true }, { f: 'kontrak', label: 'Kontrak PJBB', penting: false }, { f: 'transporter', label: 'Transporter (Kepada)', penting: true },
  { f: 'tambang', label: 'Sumber tambang', penting: true }, { f: 'kapal', label: 'Nama kapal / tongkang', penting: true }, { f: 'moda', label: 'Moda (ft)', penting: true }, { f: 'volume', label: 'Volume (ton)', penting: true },
  { f: 'muat', label: 'Pelabuhan muat', penting: true }, { f: 'laycanMulai', label: 'Laycan (mulai)', penting: true }, { f: 'laycanSelesai', label: 'Laycan (selesai)', penting: true },
  { f: 'etaMulai', label: 'ETA (mulai)', penting: true }, { f: 'etaSelesai', label: 'ETA (selesai)', penting: true },
  { f: 'pltu', label: 'PLTU tujuan', penting: true }, { f: 'consignee', label: 'Consignee', penting: false }, { f: 'notify', label: 'Notify address', penting: false }, { f: 'bongkar', label: 'Pelabuhan bongkar', penting: false },
  { f: 'skema', label: 'Skema', penting: true }, { f: 'tanggal', label: 'Tanggal SI', penting: false },
]
export const lev = (a: string, b: string) => { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c } return p[n] }
const sv = (v: any) => v == null ? '' : String(v).trim()
export function bandingkan(a: SI, b: SI): Ubah[] { return FIELDS.filter(x => sv(a[x.f]) !== sv(b[x.f])).map(x => ({ f: x.f, label: x.label, dari: sv(a[x.f]) || '—', ke: sv(b[x.f]) || '—' })) }
/** Koreksi typo hanya boleh jika setiap field penting berubah ≤ 2 karakter (angka/tanggal tidak boleh berubah sama sekali). */
export function cekKoreksi(lama: SI, baru: SI): { ok: boolean; ubah: Ubah[]; tolak: Ubah[] } {
  const ubah = bandingkan(lama, baru); const tolak = ubah.filter(u => { const fd = FIELDS.find(x => x.f === u.f)!; if (!fd.penting) return false; if (['volume', 'laycanMulai', 'laycanSelesai', 'etaMulai', 'etaSelesai', 'skema'].includes(u.f)) return true; return lev(u.dari.toLowerCase(), u.ke.toLowerCase()) > 2 })
  return { ok: !tolak.length, ubah, tolak }
}

/** Slot nomor kosong pada tahun tertentu + apakah urutan tanggalnya cocok dengan tanggal SI (untuk backdate). Celah bisa juga nomor surat Dirop lain. */
export type Slot = { n: number; prev?: SI; next?: SI; cocok: boolean; cad?: boolean }
export function slotKosong(rows: SI[], blok: Blok[], tahun: number, tanggal: string): { slot: Slot[]; terakhir: string } {
  const used = new Set<number>(); const dated: SI[] = []
  rows.forEach(r => { if (r.tahun === tahun && r.nomor != null && r.tahap !== 'pengajuan') { used.add(r.nomor); if (r.tanggal && r.tanggal <= iso(new Date(Date.now() + 864e5))) dated.push(r) } }); blok.forEach(b => { if (b.tahun === tahun && !isCad(b)) used.add(b.nomor) })
  const cad = new Set(blok.filter(b => b.tahun === tahun && isCad(b)).map(b => b.nomor)); const cadMax = Math.max(0, ...cad)
  dated.sort((a, b) => a.nomor! - b.nomor!); const mx = Math.max(0, ...used, cadMax); const slot: Slot[] = []; let i = 0
  for (let n = 1; n <= mx; n++) { if (used.has(n)) continue; while (i < dated.length && dated[i].nomor! < n) i++
    const next = dated[i], prev = dated[i - 1]; slot.push({ n, prev, next, cocok: !!tanggal && (!prev || prev.tanggal <= tanggal) && (!next || next.tanggal >= tanggal), cad: cad.has(n) }) }
  const terakhir = dated.reduce((m, r) => r.tanggal > m ? r.tanggal : m, '')
  return { slot, terakhir }
}
/** Kab./Kota lokasi PLTU yang sering dipakai (dipakai lebih dulu daripada tebakan dari alamat). */
const KAB_PLTU: [RegExp, string][] = [[/suralaya/i, 'Kota Cilegon'], [/lontar|teluk naga/i, 'Kab. Tangerang'], [/paiton/i, 'Kab. Probolinggo'], [/indramayu/i, 'Kab. Indramayu'], [/awar/i, 'Kab. Tuban'], [/tanjung jati/i, 'Kab. Jepara'], [/^batam/i, 'Kota Batam'],
  [/asam asam/i, 'Kab. Tanah Laut'], [/belitung/i, 'Kab. Belitung'], [/bukit asam/i, 'Kab. Muara Enim'], [/galang batang/i, 'Kab. Bintan'], [/anggrek|^gorontalo|sulbagut/i, 'Kab. Gorontalo Utara'], [/jeranjang|lombok energy/i, 'Kab. Lombok Barat'], [/sambelia/i, 'Kab. Lombok Timur'],
  [/nii tanasa|morosi|sampara/i, 'Kab. Konawe'], [/^ketapang/i, 'Kab. Ketapang'], [/labuhan angin/i, 'Kab. Tapanuli Tengah'], [/ombilin/i, 'Kota Sawahlunto'], [/ropa|ende/i, 'Kab. Ende'], [/sanggau/i, 'Kab. Sanggau'], [/sintang/i, 'Kab. Sintang'], [/takalar/i, 'Kab. Takalar'], [/jeneponto/i, 'Kab. Jeneponto'],
  [/karimun/i, 'Kab. Karimun'], [/sebalang/i, 'Kab. Lampung Selatan'], [/teluk sirih/i, 'Kota Padang'], [/tenayan/i, 'Kota Pekanbaru'], [/jawa-?7/i, 'Kab. Serang'], [/sofifi|tidore/i, 'Kota Tidore Kepulauan'], [/tembilahan/i, 'Kab. Indragiri Hilir'], [/palu 3/i, 'Kab. Donggala'],
  [/parit baru|kalbar 1/i, 'Kab. Bengkayang'], [/sulut 1/i, 'Kab. Bolaang Mongondow Utara'], [/bahodopi/i, 'Kab. Morowali'], [/weda/i, 'Kab. Halmahera Tengah'], [/pomalaa|antam/i, 'Kab. Kolaka'], [/cilacap|adipala/i, 'Kab. Cilacap'], [/celukan/i, 'Kab. Buleleng'], [/bangka/i, 'Kab. Bangka'],
  [/pangkalan susu/i, 'Kab. Langkat'], [/rembang/i, 'Kab. Rembang'], [/pacitan/i, 'Kab. Pacitan'], [/pelabuhan ratu/i, 'Kab. Sukabumi'], [/labuan/i, 'Kab. Pandeglang'], [/barru/i, 'Kab. Barru'], [/amurang|2 sulut/i, 'Kab. Minahasa Selatan'], [/bolok|timor-?1/i, 'Kab. Kupang'],
  [/teluk balikpapan/i, 'Kota Balikpapan'], [/holtekamp/i, 'Kota Jayapura'], [/mamuju/i, 'Kab. Mamuju'], [/malinau/i, 'Kab. Malinau'], [/ampana/i, 'Kab. Tojo Una-Una'], [/nagan raya/i, 'Kab. Nagan Raya'], [/pulang pisau/i, 'Kab. Pulang Pisau'], [/berau/i, 'Kab. Berau'], [/bengkulu|tlb\b/i, 'Kota Bengkulu'],
  [/sumbawa barat/i, 'Kab. Sumbawa Barat'], [/embalut|cahaya fajar|indonesia energi dinamika/i, 'Kab. Kutai Kartanegara'], [/cirebon/i, 'Kota Cirebon'], [/ciwandan|lestari banten|krakatau/i, 'Kota Cilegon'], [/bojonegara/i, 'Kab. Serang'], [/marunda/i, 'Kota Jakarta Utara'], [/lamongan/i, 'Kab. Lamongan'],
  [/tanjung mas/i, 'Kota Semarang'], [/gresik|maspion/i, 'Kab. Gresik'], [/bantaeng|huadi/i, 'Kab. Bantaeng'], [/asahimas/i, 'Kota Cilegon'], [/tanjung tembaga/i, 'Kota Probolinggo'], [/indocement/i, 'Kab. Bogor'], [/sibolga/i, 'Kab. Tapanuli Tengah']]
/** Pelabuhan bongkar otomatis: "PLTU <nama>, <Kab./Kota>" dari nama PLTU di referensi + alamat notify. Jetty/pelabuhan non-PLTU tidak diberi awalan PLTU. */
export function pelabuhanBongkar(nama: string, notify = '', consignee = ''): string {
  const n = (nama || '').replace(/\s+/g, ' ').trim(); if (!n) return ''
  const tanpa = n.replace(/^PLTU\s+/i, '')
  const m = tanpa.match(/^(.*?)(?:\s*[.,]\s+|\s+[–-]\s+)(.*)$/); let base = (m ? m[1] : tanpa).trim(), sisa = (m ? m[2] : '').trim()
  if (/^\d+\s*x|MW\b/i.test(sisa)) { base = tanpa; sisa = '' }
  const kabRe = /\b(Kab(?:upaten)?\.?\s*[A-Z][A-Za-z'-]*(?:\s+(?!Jawa|Banten|Sulawesi|Kalimantan|Sumatera|Nusa|Provinsi|Prov|Jl|Kec|Desa|Ds)[A-Z][A-Za-z'-]*){0,2}|Kota\s+(?!Adm)[A-Z][A-Za-z'-]*(?:\s+(?!Jawa|Banten|Sulawesi|Kalimantan|Sumatera|Nusa|Provinsi|Prov|Jl)[A-Z][A-Za-z'-]*){0,2})/
  const rapi = (k: string) => k.replace(/^Kab(?:upaten)?\.?\s*/i, 'Kab. ').replace(/\s+/g, ' ').trim()
  const peta = KAB_PLTU.find(([re]) => re.test(n))?.[1]
  const kab = peta || (sisa.match(kabRe) || [])[1] || (notify.match(kabRe) || [])[1] || (consignee.match(kabRe) || [])[1] || ''
  const bukanPltu = /^(jetty|pt\b|pelabuhan|tuks|duks)|port\b|anchorage|jetty/i.test(base) || /\bPLTU\b/i.test(base)
  const nm = bukanPltu ? base : `PLTU ${base}`
  return kab ? `${nm}, ${rapi(kab)}` : nm
}
