/** Ringkasan operasi dalam PDF A4 (teks vektor). Tata letak sengaja sederhana seperti laporan cetak:
 *  judul serif, tabel bergaris tipis, satu warna aksen, tanpa ikon, bayangan, atau gradasi. */
import { fmtNum } from '../domain/format'
const fmtPct = (n: number | null | undefined) => n == null ? '—' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n) + '%'

export type RingkasanData = {
  bulan: string; posisi: string; dibuat: string; sumber: string
  target: number; co: number; bl: number; ds: number
  tahap: { label: string; n: number; vol: number }[]
  rincian: { label: string; konf: number; real: number }[]
  wilayah: { nama: string; target: number; co: number; bl: number; ds: number; n: number }[]
  perhatian: { pltu: string; wilayah: string; keb: number; ds: number; jalan: number }[]; ambang: number; jumlahPltu: number; jumlahDiBawahAmbang: number
  kontrak: null | { bulanTermuat: number; volume: number; realisasi: number; jumlah: number; tanpaRealisasi: number; tanpaKontrakMT: number; tanpaKontrakN: number; pemasok: { nama: string; kontrak: number; real: number }[] }
  catatan: string[]
}

const W = 595.28, H = 841.89, ML = 54, MR = 54, CW = W - ML - MR, TOP = 58, BOT = 56
const INK = '#1d2430', MUTED = '#5b6573', RULE = '#c9ced6', SOFT = '#eef0f3', ACC = '#1f5f4a', WARN = '#8a5200'
const pc = (a: number, b: number) => b > 0 ? a / b * 100 : null
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

export async function buildRingkasanPdf(d: RingkasanData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' }); pdf.setProperties({ title: `Ringkasan Operasi Pasokan ${d.bulan} 2026`, author: 'PT PLN Batubara Niaga', subject: 'Ringkasan dashboard operasi' })
  let y = TOP
  const col = (h: string) => pdf.setTextColor(...rgb(h)); const fill = (h: string) => pdf.setFillColor(...rgb(h)); const stroke = (h: string, w = 0.5) => { pdf.setDrawColor(...rgb(h)); pdf.setLineWidth(w) }
  const font = (f: 'helvetica' | 'times', s: 'normal' | 'bold' | 'italic', size: number, c = INK) => { pdf.setFont(f, s); pdf.setFontSize(size); col(c) }
  const rule = (yy: number, c = RULE, w = 0.5, x1 = ML, x2 = W - MR) => { stroke(c, w); pdf.line(x1, yy, x2, yy) }
  const need = (h: number) => { if (y + h > H - BOT) { pdf.addPage(); y = TOP } }
  const para = (t: string, size = 10, c = INK, lh = 1.5, w = CW) => { font('helvetica', 'normal', size, c); const ls = pdf.splitTextToSize(t, w) as string[]; need(ls.length * size * lh); ls.forEach(l => { pdf.text(l, ML, y + size); y += size * lh }) }
  const h2 = (t: string, sub?: string, rows = 3) => { need(70 + rows * 19); y += 16; font('times', 'bold', 15, INK); pdf.text(t, ML, y + 11); y += 18; rule(y, INK, 0.9); y += 8; if (sub) { para(sub, 9, MUTED, 1.45); y += 2 } else y += 2 }

  type C = { h: string; w: number; r?: boolean }
  const table = (cols: C[], rows: (string | number)[][], opt: { bold?: boolean; total?: (string | number)[]; barCol?: number } = {}) => {
    const tw = cols.reduce((a, c) => a + c.w, 0), k = CW / tw; const xs: number[] = []; let x = ML; cols.forEach(c => { xs.push(x); x += c.w * k })
    const head = () => { need(40); font('helvetica', 'bold', 7.6, MUTED); cols.forEach((c, i) => { const t = c.h.toUpperCase(); const cx = c.r ? xs[i] + c.w * k - 4 : xs[i]; pdf.text(t, cx, y + 8, { align: c.r ? 'right' : 'left' }) }); y += 13; rule(y, INK, 0.6); y += 1 }
    need(13 + (rows.length + (opt.total ? 1 : 0)) * 19 + 14); y += 4
    head()
    const rowH = 19
    const line = (r: (string | number)[], bold = false, shade = false) => {
      if (y + rowH > H - BOT) { pdf.addPage(); y = TOP; head() }
      if (shade) { fill(SOFT); pdf.rect(ML, y, CW, rowH, 'F') }
      font('helvetica', bold ? 'bold' : 'normal', 9, INK)
      r.forEach((v, i) => { const c = cols[i]; const s = String(v); const cx = c.r ? xs[i] + c.w * k - 4 : xs[i] + (shade ? 4 : 0); let t = s; const mw = c.w * k - 8; while (pdf.getTextWidth(t) > mw && t.length > 3) t = t.slice(0, -2); if (t !== s) t = t.trimEnd() + '…'; pdf.text(t, cx, y + 13, { align: c.r ? 'right' : 'left' }) })
      y += rowH; rule(y, RULE, 0.35)
    }
    rows.forEach(r => line(r))
    if (opt.total) { rule(y, INK, 0.8); line(opt.total, true, true) }
    y += 4
  }
  const bar = (x: number, yy: number, w: number, frac: number, c = ACC) => { fill(SOFT); pdf.rect(x, yy, w, 5, 'F'); fill(c); pdf.rect(x, yy, Math.max(0, Math.min(1, frac)) * w, 5, 'F') }

  // ---------- kepala dokumen ----------
  font('helvetica', 'bold', 7.8, ACC); pdf.text('PT PLN BATUBARA NIAGA  ·  DIREKTORAT OPERASI', ML, y + 8); y += 20
  font('times', 'bold', 27, INK); pdf.text('Ringkasan Operasi Pasokan', ML, y + 22); y += 34
  font('times', 'italic', 12.5, MUTED); pdf.text(`Bulan ${d.bulan} 2026  ·  posisi data ${d.posisi}`, ML, y + 11); y += 22
  rule(y, INK, 1.4); y += 14

  // ---------- gambaran umum ----------
  const keb = d.target + d.co, sisa = Math.max(0, keb - d.ds), jalan = d.tahap.filter(t => ['Loading', 'Sailing', 'Tiba/Antri', 'Proses Bongkar'].includes(t.label)), nJalan = jalan.reduce((a, t) => a + t.n, 0), vJalan = jalan.reduce((a, t) => a + t.vol, 0)
  font('times', 'bold', 15, INK); pdf.text('Gambaran umum', ML, y + 11); y += 20
  para(`Kebutuhan pasokan ${d.bulan} sebesar ${fmtNum(keb)} MT, terdiri dari konfirmasi bulan berjalan ${fmtNum(d.target)} MT dan carry over ${fmtNum(d.co)} MT. Sampai posisi data ini, ${fmtNum(d.bl)} MT (${fmtPct(pc(d.bl, keb))} dari kebutuhan) sudah dimuat di pelabuhan muat dan ${fmtNum(d.ds)} MT (${fmtPct(pc(d.ds, keb))}) sudah dibongkar di PLTU. Sisa kebutuhan yang belum terpenuhi ${fmtNum(sisa)} MT.`, 10.5, INK, 1.55)
  y += 4
  para(`Ada ${fmtNum(nJalan)} shipment yang sedang berjalan, dari tahap loading sampai proses bongkar, dengan total ${fmtNum(vJalan)} MT. ${d.jumlahDiBawahAmbang} dari ${d.jumlahPltu} PLTU yang punya kebutuhan bulan ini masih di bawah ${d.ambang}% pemenuhan.`, 10.5, INK, 1.55)

  // ---------- angka utama ----------
  h2('Angka utama', 'Persentase dihitung terhadap kebutuhan (konfirmasi ditambah carry over). Pemenuhan memakai volume bongkar (D/S).')
  table([{ h: 'Komponen', w: 5 }, { h: 'Volume (MT)', w: 2.6, r: true }, { h: '% kebutuhan', w: 2, r: true }], [
    ['Konfirmasi bulan ini', fmtNum(d.target), fmtPct(pc(d.target, keb))], ['Carry over', fmtNum(d.co), fmtPct(pc(d.co, keb))],
    ['Complete Loading (B/L)', fmtNum(d.bl), fmtPct(pc(d.bl, keb))], ['Complete Unloading (D/S)', fmtNum(d.ds), fmtPct(pc(d.ds, keb))], ['Sisa belum terpenuhi', fmtNum(sisa), fmtPct(pc(sisa, keb))]],
    { total: ['Kebutuhan (konfirmasi + carry over)', fmtNum(keb), '100,0%'] })

  // ---------- tahapan ----------
  h2('Posisi shipment per tahapan', 'Jumlah shipment dan volume pada setiap tahap, dari penjadwalan sampai selesai bongkar.')
  const mx = Math.max(1, ...d.tahap.map(t => t.vol)); const totN = d.tahap.reduce((a, t) => a + t.n, 0), totV = d.tahap.reduce((a, t) => a + t.vol, 0)
  const tw = [150, 55, 90]; need(30 + (d.tahap.length + 1) * 19); y += 4
  font('helvetica', 'bold', 7.6, MUTED); pdf.text('TAHAPAN', ML, y + 8); pdf.text('SHIPMENT', ML + tw[0] + tw[1], y + 8, { align: 'right' }); pdf.text('VOLUME (MT)', ML + tw[0] + tw[1] + tw[2], y + 8, { align: 'right' }); pdf.text('PROPORSI VOLUME', ML + tw[0] + tw[1] + tw[2] + 22, y + 8); y += 13; rule(y, INK, 0.6); y += 1
  d.tahap.forEach(t => { need(20); font('helvetica', 'normal', 9, INK); pdf.text(t.label, ML, y + 13); pdf.text(fmtNum(t.n), ML + tw[0] + tw[1], y + 13, { align: 'right' }); pdf.text(fmtNum(t.vol), ML + tw[0] + tw[1] + tw[2], y + 13, { align: 'right' }); bar(ML + tw[0] + tw[1] + tw[2] + 22, y + 8, CW - (tw[0] + tw[1] + tw[2] + 22), t.vol / mx, t.label === 'Selesai Bongkar' || t.label === 'Unloading' ? ACC : '#7b8794'); y += 19; rule(y, RULE, 0.35) })
  rule(y, INK, 0.8); fill(SOFT); pdf.rect(ML, y, CW, 19, 'F'); font('helvetica', 'bold', 9, INK); pdf.text('Total', ML + 4, y + 13); pdf.text(fmtNum(totN), ML + tw[0] + tw[1], y + 13, { align: 'right' }); pdf.text(fmtNum(totV), ML + tw[0] + tw[1] + tw[2], y + 13, { align: 'right' }); y += 23

  // ---------- rincian ----------
  h2('Rincian konfirmasi dan realisasi', 'Realisasi di sini adalah Complete Loading (B/L) terhadap konfirmasi masing-masing kelompok.', 4)
  table([{ h: 'Kelompok', w: 4 }, { h: 'Konfirmasi (MT)', w: 2.6, r: true }, { h: 'Realisasi B/L (MT)', w: 2.8, r: true }, { h: '%', w: 1.4, r: true }],
    d.rincian.map(r => [r.label, fmtNum(r.konf), fmtNum(r.real), fmtPct(pc(r.real, r.konf))]),
    { total: ['Total', fmtNum(d.rincian.reduce((a, r) => a + r.konf, 0)), fmtNum(d.rincian.reduce((a, r) => a + r.real, 0)), fmtPct(pc(d.rincian.reduce((a, r) => a + r.real, 0), d.rincian.reduce((a, r) => a + r.konf, 0)))] })

  // ---------- wilayah ----------
  h2('Pemenuhan per wilayah', 'Urutan wilayah mengikuti laporan harian. Persentase D/S terhadap kebutuhan wilayah.', 7)
  const wr = d.wilayah.filter(w => w.target + w.co + w.bl + w.ds > 0)
  const tt = wr.reduce((a, w) => ({ t: a.t + w.target, c: a.c + w.co, b: a.b + w.bl, u: a.u + w.ds, n: a.n + w.n }), { t: 0, c: 0, b: 0, u: 0, n: 0 })
  table([{ h: 'Wilayah', w: 3 }, { h: 'Konfirmasi', w: 2.2, r: true }, { h: 'Carry over', w: 2, r: true }, { h: 'B/L', w: 2, r: true }, { h: 'D/S', w: 2, r: true }, { h: '% D/S', w: 1.5, r: true }],
    wr.map(w => [w.nama, fmtNum(w.target), fmtNum(w.co), fmtNum(w.bl), fmtNum(w.ds), fmtPct(pc(w.ds, w.target + w.co))]),
    { total: ['Seluruh wilayah', fmtNum(tt.t), fmtNum(tt.c), fmtNum(tt.b), fmtNum(tt.u), fmtPct(pc(tt.u, tt.t + tt.c))] })

  // ---------- perhatian ----------
  h2('PLTU dengan kebutuhan terbesar yang belum terpenuhi', `Diurutkan menurut sisa kebutuhan. "Dalam perjalanan" = volume shipment yang sudah loading sampai proses bongkar tetapi belum selesai bongkar. Ambang perhatian ${d.ambang}%.`, d.perhatian.length)
  table([{ h: 'PLTU', w: 3.2 }, { h: 'Wilayah', w: 2.4 }, { h: 'Kebutuhan', w: 2, r: true }, { h: 'D/S', w: 1.6, r: true }, { h: '% D/S', w: 1.4, r: true }, { h: 'Dalam perjalanan', w: 2.4, r: true }],
    d.perhatian.map(p => [p.pltu, p.wilayah, fmtNum(p.keb), fmtNum(p.ds), fmtPct(pc(p.ds, p.keb)), fmtNum(p.jalan)]))

  // ---------- kontrak ----------
  if (d.kontrak) {
    const k = d.kontrak
    h2('Kontrak dan realisasi tahun 2026', `Realisasi = Unloading (D/S) dari ${k.bulanTermuat} bulan yang termuat, dibandingkan dengan volume kontrak tahunan. Pemenuhan kontrak yang rendah di awal tahun wajar karena volume kontrak berlaku setahun penuh.`, 10)
    y += 4; para(`Dari ${k.jumlah} kontrak dengan total volume ${fmtNum(k.volume)} MT, realisasi sementara ${fmtNum(k.realisasi)} MT (${fmtPct(pc(k.realisasi, k.volume))}). ${k.tanpaRealisasi} kontrak belum tercatat realisasinya. Di luar daftar kontrak, ada ${k.tanpaKontrakN} pemasok dengan realisasi ${fmtNum(k.tanpaKontrakMT)} MT yang belum ditemukan di portofolio kontrak.`, 10, INK, 1.55); y += 6
    table([{ h: 'Pemasok (volume kontrak terbesar)', w: 4.6 }, { h: 'Kontrak (MT)', w: 2.4, r: true }, { h: 'Realisasi (MT)', w: 2.4, r: true }, { h: '%', w: 1.2, r: true }],
      k.pemasok.map(p => [p.nama, fmtNum(p.kontrak), fmtNum(p.real), fmtPct(pc(p.real, p.kontrak))]))
  }

  // ---------- catatan ----------
  h2('Catatan data')
  d.catatan.forEach(c => { need(24); font('helvetica', 'normal', 9, MUTED); const ls = pdf.splitTextToSize(c, CW - 14) as string[]; need(ls.length * 13); pdf.text('–', ML + 2, y + 9); ls.forEach(l => { pdf.text(l, ML + 14, y + 9); y += 13 }); y += 3 })

  // ---------- kaki halaman ----------
  const n = pdf.getNumberOfPages()
  for (let i = 1; i <= n; i++) { pdf.setPage(i); rule(H - 40, RULE, 0.5); font('helvetica', 'normal', 7.8, MUTED); pdf.text(`Ringkasan Operasi Pasokan  ·  ${d.bulan} 2026  ·  PT PLN Batubara Niaga`, ML, H - 28); pdf.text(`Halaman ${i} dari ${n}`, W - MR, H - 28, { align: 'right' }); if (i === n) { pdf.text(d.dibuat, ML, H - 18) } }
  void WARN
  return pdf.output('blob')
}
