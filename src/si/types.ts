export type Skema = 'FOB' | 'CIF' | 'Freight'
export type Alasan = 'armada' | 'laycan' | 'volume' | 'pelabuhan' | 'lainnya'
export const ALASAN: Record<Alasan, string> = { armada: 'Armada / kapal diganti', laycan: 'Laycan / ETA berubah', volume: 'Volume berubah', pelabuhan: 'Pelabuhan muat / bongkar berubah', lainnya: 'Lainnya' }
/** pengajuan = belum bernomor (diajukan Andi/Billy, menunggu Racel); terbit = bernomor; batal = nomor dipakai tapi SI dibatalkan */
export type Tahap = 'pengajuan' | 'terbit' | 'batal'
export type SI = {
  id: string
  tahap: Tahap
  nomor: number | null
  tahun: number
  tanggal: string // ISO yyyy-mm-dd (tanggal terbit)
  pemohon: string // Andi / Billy / …
  skema: Skema; kelistrikan: boolean; bib: boolean
  mitra: string; kontrak: string; transporter: string; kontrakTransport: string
  tropical: number | null // Tropical Draft (template BIB)
  tambang: string; kapal: string; moda: string; volume: number | null
  muat: string; laycanMulai: string; laycanSelesai: string; laycanTeks: string
  etaMulai: string; etaSelesai: string; etaTeks: string
  pltu: string; consignee: string; notify: string; bongkar: string
  revisiKe: number; sebelumnyaId: string; sebelumnyaNomor: number | null; alasan: Alasan | ''; ketRevisi: string
  perubahan: Ubah[] // revisi: apa yang berubah dibanding SI sebelumnya
  koreksi: Koreksi[] // koreksi penulisan (typo) — nomor tetap, bukan revisi
  ttd: boolean // sudah ditandatangani Dirop
  sumber: 'sistem' | 'sheet-2026' | 'databas'
  dibuat: string; dibuatOleh: string; diubah: string; arsipUrl?: string
}
export type Ubah = { f: string; label: string; dari: string; ke: string }
export type Koreksi = { at: string; oleh: string; ubah: Ubah[] }
export type Blok = { tahun: number; nomor: number; ket: string }
export const kosong = (): SI => ({ id: '', tahap: 'pengajuan', nomor: null, tahun: new Date().getFullYear(), tanggal: '', pemohon: '', skema: 'FOB', kelistrikan: true, bib: false, mitra: '', kontrak: '', transporter: '', kontrakTransport: '', tropical: null, tambang: '', kapal: '', moda: '', volume: null, muat: '', laycanMulai: '', laycanSelesai: '', laycanTeks: '', etaMulai: '', etaSelesai: '', etaTeks: '', pltu: '', consignee: '', notify: '', bongkar: '', revisiKe: 0, sebelumnyaId: '', sebelumnyaNomor: null, alasan: '', ketRevisi: '', perubahan: [], koreksi: [], ttd: false, sumber: 'sistem', dibuat: '', dibuatOleh: '', diubah: '' })
