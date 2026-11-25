import Papa from 'papaparse'
import type { Kontrak } from '../config/kontrak'
import { clusterOf, newId } from './kontrak'
/** Google Sheet "Database Kontrak Batubara PT PLN Batubara Niaga" (dibagikan: siapa pun yang punya link bisa melihat). Tab pertama = Kontrak & Amendemen Pelanggan tahun berjalan. */
export const KONTRAK_SHEET_ID = '1H3sBE4vYfFiDdeYTjoneEkasD7tx03O_I6az9GE62gM'
export const KONTRAK_SHEET_TAB = 'Kontrak & Amendemen Pelanggan Tahun 2026'
export const KONTRAK_CSV_URL = `https://docs.google.com/spreadsheets/d/${KONTRAK_SHEET_ID}/export?format=csv`
export const KONTRAK_SHEET_LINK = `https://docs.google.com/spreadsheets/d/${KONTRAK_SHEET_ID}/edit`
const c = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const angka = (v: unknown) => { const s = c(v).replace(/[^\d.,-]/g, ''); if (!s || s === '-') return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null }
/** Nama pendek pelanggan: isi kurung "(PLTU …)" bila ada, "PT PLN Batam" → "PLN Batam". */
export function pelangganPendek(n: string) {
  const s = c(n); const m = s.match(/\((PLTU[^)]*)\)/i); if (m) return m[1].trim()
  return s.replace(/^PT\s+(?=PLN|Paiton)/i, '')
}
/** Baca tab Kontrak & Amendemen Pelanggan. Baris lanjutan (tanpa No) mewarisi pelanggan/nomor/tanggal dari baris kelompoknya; baris harga tambahan tanpa sumber tambang dilewati. */
export function parseKontrakSheet(text: string): Kontrak[] {
  const all = Papa.parse<string[]>(text, { skipEmptyLines: false }).data as string[][]
  const hi = all.findIndex(r => r.some(x => c(x) === 'Pelanggan') && r.some(x => /IUPOP\/PKP2B/i.test(c(x)))); if (hi < 0) return []
  const H = all[hi].map(c); const f = (re: RegExp) => H.findIndex(x => re.test(x))
  const k = { no: f(/^No$/), pel: f(/^Pelanggan$/), tr: f(/^IUPOPK/i), tb: f(/^IUPOP\/PKP2B/i), nom: f(/Nomor Kontrak/i), mulai: f(/^Tanggal Kontrak/i), akhir: f(/^Tanggal Berakhir/i), jenis: f(/Amendemen\/ ?Kontrak Baru/i), sk: f(/^CIF\/FOB/i), gcv: f(/^GCV/i), vol: f(/^Total Volume/i), hrg: f(/^Harga Batubara Tidak Termasuk PPN \(Pfobv\)/i), ket: f(/^Keterangan$/i) }
  const out: Kontrak[] = []; let g = { no: '', pel: '', nom: '', mulai: '', akhir: '', jenis: '', sk: '' }
  for (const r of all.slice(hi + 1)) {
    const v = (i: number) => (i >= 0 ? c(r[i]) : ''); const no = v(k.no), pel = v(k.pel)
    if (/kosong/i.test(pel) || /kosong/i.test(v(k.tb))) { g = { ...g, no: '', pel: '' }; continue }
    if (no) g = { no, pel: pel || g.pel, nom: v(k.nom), mulai: v(k.mulai), akhir: v(k.akhir), jenis: v(k.jenis), sk: v(k.sk) }
    else if (pel) g.pel = pel
    const tambang = v(k.tb).replace(/^Bleending$/i, 'Blending'); if (!tambang || !g.pel) continue
    const gar = angka(v(k.gcv)) ?? 0, vol = angka(v(k.vol)) ?? 0, nomor = v(k.nom) || g.nom
    out.push({ id: newId(), no: no || g.no, pelanggan: pelangganPendek(g.pel), pelangganLengkap: g.pel, tambang, gar, cluster: clusterOf(gar || 4000), vol, status: !gar || (!vol && !nomor) ? 1 : 0,
      trader: v(k.tr).replace(/^-$/, '').replace(/^Bleending$/i, 'Blending'), nomor, mulai: v(k.mulai) || g.mulai, akhir: v(k.akhir) || g.akhir, jenis: (v(k.jenis) || g.jenis).replace(/Amendemn/i, 'Amendemen'), skema: v(k.sk) || g.sk, harga: angka(v(k.hrg)), ket: v(k.ket).replace(/^-$/, '') })
  }
  return out
}
