import { STEPS, pctl } from './monthly'
/** Analisis dugaan penyebab keterlambatan shipment. Lapisan 1 = aturan (deterministik, dihitung di peramban); lapisan 2 = AI (scripts/analisis.ts, dijalankan di GitHub Actions). Hasilnya HIPOTESIS dari tanggal milestone dan catatan sheet, bukan penyebab yang sudah dikonfirmasi. */
export type Stat = { med: number | null; p75: number | null; n: number }
export const CAUSE = [
  'penerbitan SI → kapal tiba di pelabuhan muat (kesiapan armada/tugboat, mobilisasi ke pelabuhan muat)',
  'kapal sudah di pelabuhan muat → sandar (antrean sandar/jetty muat, cuaca, kesiapan jetty)',
  'sandar → mulai muat (kesiapan batubara/stok, dokumen, inspeksi, antrean muat)',
  'durasi muat (laju muat/produksi/stockpile, cuaca, peralatan loading)',
  'selesai muat → berlayar (dokumen, surveyor, izin berlayar, cuaca)',
  'pelayaran (jarak/rute, cuaca & gelombang, kecepatan armada, pengalihan tujuan)',
  'tiba di PLTU → sandar bongkar (antrean kapal, kesiapan jetty/dermaga PLTU, cuaca, pasang surut)',
  'sandar → mulai bongkar (kesiapan unloader/peralatan bongkar, area penimbunan penuh, inspeksi)',
  'durasi bongkar (laju bongkar, kerusakan alat, area penimbunan, cuaca)',
]
export const stepStats = (list: { ms: (number | null)[] }[], stepDays: (ms: (number | null)[]) => (number | null)[]): Stat[] => {
  const cols: number[][] = STEPS.map(() => []); for (const s of list) stepDays(s.ms).forEach((d, i) => { if (d != null) cols[i].push(d) })
  return cols.map(c => { const a = [...c].sort((x, y) => x - y); return { med: pctl(a, .5), p75: pctl(a, .75), n: a.length } })
}
export const TAGS: [string, RegExp][] = [['Dibatalkan', /batal|cancel/i], ['Dialihkan / rekonfirmasi', /alih|rekonfirm|re-?konfirm|pindah|ganti\s*(pltu|tujuan)/i], ['Kendala RKAB / izin', /rkab|izin|perizinan|kuota/i], ['Cuaca', /cuaca|gelombang|ombak|angin|badai|hujan/i], ['Antrean', /antri|antre|queue|menunggu\s*(sandar|jetty|dermaga)/i], ['Kendala teknis', /rusak|kerusakan|breakdown|trouble|gangguan|bocor|mesin|unloader/i], ['Produksi / stok', /produksi|stok|stock|pasokan\s*tambang|belum\s*siap/i], ['Jadwal digeser', /geser|mundur|reschedul|jadwal\s*ulang|tunda|delay/i]]
export const noteTags = (note: string) => TAGS.filter(([, r]) => r.test(note)).map(([t]) => t)
export type Analisis = { slow: { i: number; days: number; med: number; over: number }[]; running: { i: number; days: number; p75: number } | null; tags: string[]; utama: number | null; teks: string }
const f1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')
/** d = stepDays(ms). Tahap "lambat" = melebihi median ≥ 1 hari; tahap yang sedang berjalan dinilai terhadap P75. ref = hari ini (ms UTC). */
export function analisis(ms: (number | null)[], d: (number | null)[], stats: Stat[], note: string, ref: number, delay: number | null): Analisis {
  const slow: Analisis['slow'] = []
  d.forEach((x, i) => { const m = stats[i]?.med; if (x != null && m != null && x - m >= 1) slow.push({ i, days: x, med: m, over: x - m }) })
  slow.sort((a, b) => b.over - a.over)
  let running: Analisis['running'] = null
  const last = ms.reduce<number>((a, v, i) => v != null ? i : a, -1)
  if (last >= 0 && last < 9) { const p = stats[last]?.p75, el = (ref - (ms[last] as number)) / 864e5; if (p != null && el > p && el >= 1) running = { i: last, days: el, p75: p } }
  const tags = noteTags(note)
  const utama = slow.length ? slow[0].i : running ? running.i : null
  const bag: string[] = []
  if (delay != null && delay > 0) bag.push(`Terlambat ${f1(delay)} hari dari ETA Rakor.`)
  if (slow.length) bag.push(`Tahap paling melebihi kebiasaan: ${STEPS[slow[0].i]} (${f1(slow[0].days)} hari, median ${f1(slow[0].med)} hari) — dugaan: ${CAUSE[slow[0].i]}.`)
  if (running) bag.push(`Tahap berjalan ${STEPS[running.i]} sudah ${f1(running.days)} hari (P75 ${f1(running.p75)} hari) — dugaan: ${CAUSE[running.i]}.`)
  if (tags.length) bag.push(`Catatan sheet menyebut: ${tags.join(', ')}.`)
  if (!bag.length || (!slow.length && !running && !tags.length)) bag.push('Tidak ada tahap yang menonjol dari tanggal milestone; kemungkinan ETA Rakor sejak awal terlalu optimistis atau tanggal milestone belum lengkap.')
  return { slow, running, tags, utama, teks: bag.join(' ') }
}
/** Ringkasan bukti yang dikirim ke AI: hanya data dari sheet, tanpa data pribadi. */
export const evidence = (s: { id: string; plant: string; tbbg: string; mitraReal: string; jetty: string; stage: string | null; note?: string }, delay: number, a: Analisis, d: (number | null)[], stats: Stat[]) => ({
  id: s.id, pltu: s.plant, kapal: s.tbbg, mitra: s.mitraReal, jetty: s.jetty, status: s.stage, terlambat_hari: Math.round(delay * 10) / 10, catatan: (s.note ?? '').slice(0, 300), tag_catatan: a.tags,
  tahap: STEPS.map((n, i) => ({ n, hari: d[i] == null ? null : Math.round((d[i] as number) * 10) / 10, median: stats[i]?.med == null ? null : Math.round((stats[i].med as number) * 10) / 10, p75: stats[i]?.p75 == null ? null : Math.round((stats[i].p75 as number) * 10) / 10 })),
  dugaan_aturan: a.teks })
export const AI_SYSTEM = `Anda analis operasi pengiriman batubara PT PLN Batubara Niaga. Untuk setiap shipment yang terlambat, tentukan DUGAAN penyebab utama keterlambatan berdasarkan HANYA data yang diberikan (lama tiap tahap dibanding median/P75 seluruh shipment, catatan sheet, dugaan aturan).
Aturan: jangan mengarang fakta (nama cuaca, kerusakan, antrean) yang tidak ada di data; bila bukti lemah, katakan bukti terbatas dan beri keyakinan "rendah". Pakai istilah laporan harian (Carry Over, Loading, Sailing, Tiba/Antri, Proses Bongkar, Unloading). Bahasa Indonesia, maksimal 2 kalimat per shipment.
Keluaran WAJIB hanya JSON valid tanpa teks lain: {"hasil":[{"id":"<id persis seperti input>","t":"<analisis>","k":"tinggi|sedang|rendah"}]}`
export type AiHasil = { id: string; t: string; k: 'tinggi' | 'sedang' | 'rendah' }
/** Mengurai balasan model; toleran terhadap pagar kode ```json dan teks pembuka. Entri tidak valid dibuang. */
export function parseAiJson(text: string): AiHasil[] {
  const s = text.replace(/```(?:json)?/gi, '').trim(), a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) return []
  try { const j = JSON.parse(s.slice(a, b + 1)); const arr = Array.isArray(j) ? j : j.hasil; if (!Array.isArray(arr)) return []
    return arr.filter((x: any) => x && typeof x.id === 'string' && typeof x.t === 'string' && x.t.trim()).map((x: any) => ({ id: x.id, t: x.t.trim(), k: ['tinggi', 'sedang', 'rendah'].includes(x.k) ? x.k : 'rendah' })) } catch { return [] }
}
