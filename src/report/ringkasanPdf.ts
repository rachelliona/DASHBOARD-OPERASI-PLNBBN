/** Ringkasan operasi dalam PDF A4 (teks vektor, font Poppins seperti laporan harian, warna mengikuti dashboard). */
import { fmtNum } from '../domain/format'

export type RingkasanData = {
  bulan: string; posisi: string; dibuat: string; sumber: string
  target: number; co: number; bl: number; ds: number
  tahap: { key: string; label: string; n: number; vol: number }[]
  rincian: { label: string; konf: number; real: number }[]
  wilayah: { nama: string; target: number; co: number; bl: number; ds: number; n: number }[]
  perhatian: { pltu: string; wilayah: string; keb: number; ds: number; jalan: number }[]; ambang: number; jumlahPltu: number; jumlahDiBawahAmbang: number
  kontrak: null | { bulanTermuat: number; volume: number; realisasi: number; jumlah: number; tanpaRealisasi: number; tanpaKontrakMT: number; tanpaKontrakN: number; pemasok: { nama: string; kontrak: number; real: number }[] }
  catatan: string[]
}

const W = 595.28, H = 841.89, ML = 40, MR = 40, CW = W - ML - MR, TOP = 40, BOT = 54
const INK = '#23272f', MUTED = '#667085', RULE = '#d9dde3', ZEBRA = '#f5f6f2', OLIVE = '#4a4a2e', RED = '#c8312a', BLUE = '#3b5ea0', GREEN = '#3f9a2a', SKY = '#2e86c1', ORANGE = '#e8782a', PURPLE = '#8f3a96', GREY = '#8b95a5', AMBER = '#f0a030'
const STAGE: Record<string, string> = { terjadwal: GREY, loading: SKY, sailing: ORANGE, tiba: '#2f4a8a', bongkar: PURPLE, unloading: GREEN }
const REG: Record<string, string> = { JAMALI: '#d4a017', Sumatra: '#14a38f', Kalimantan: '#d6458f', 'Sulmapana 1': '#7aa21a', 'Sulmapana 2': '#a98055', 'PLTU IPP': '#7b8794', Lainnya: '#8e7cc3' }
const tone = (p: number | null) => p == null ? GREY : p >= 85 ? '#2e9e6b' : p >= 60 ? '#1aa39a' : p >= 30 ? '#1f8fb8' : '#3f6fd0'
const pc = (a: number, b: number) => b > 0 ? a / b * 100 : null
const P1 = (n: number | null | undefined) => n == null ? '—' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n) + '%'
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (h: string, t: number) => { const [r, g, b] = rgb(h); const f = (v: number) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b) }

const base = import.meta.env.BASE_URL
const bin = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error('Gagal memuat ' + u); return new Uint8Array(await r.arrayBuffer()) }
const b64 = (a: Uint8Array) => { let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s) }
const dataUrl = async (u: string) => 'data:image/png;base64,' + b64(await bin(u))

export async function buildRingkasanPdf(d: RingkasanData): Promise<Blob> {
  const [{ jsPDF }, fR, fM, fB, logo] = await Promise.all([import('jspdf'), bin(base + 'laporan/fonts/Poppins-Regular.ttf'), bin(base + 'laporan/fonts/Poppins-Medium.ttf'), bin(base + 'laporan/fonts/Poppins-Bold.ttf'), dataUrl(base + 'logo-light.png')])
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' }); pdf.setProperties({ title: `Ringkasan Operasi Pasokan ${d.bulan} 2026`, author: 'PT PLN Batubara Niaga', subject: 'Ringkasan dashboard operasi' })
  ;([['Poppins-Regular.ttf', fR, 'normal'], ['Poppins-Medium.ttf', fM, 'medium'], ['Poppins-Bold.ttf', fB, 'bold']] as [string, Uint8Array, string][]).forEach(([n, f, st]) => { pdf.addFileToVFS(n, b64(f)); pdf.addFont(n, 'Poppins', st) })
  let y = TOP
  const col = (h: string) => pdf.setTextColor(...rgb(h)); const fill = (h: string) => pdf.setFillColor(...rgb(h)); const stroke = (h: string, w = 0.5) => { pdf.setDrawColor(...rgb(h)); pdf.setLineWidth(w) }
  const font = (st: 'normal' | 'medium' | 'bold', size: number, c = INK) => { pdf.setFont('Poppins', st); pdf.setFontSize(size); col(c) }
  const rect = (x: number, yy: number, w: number, h: number, c: string, r = 0) => { fill(c); r ? pdf.roundedRect(x, yy, w, h, r, r, 'F') : pdf.rect(x, yy, w, h, 'F') }
  const hline = (yy: number, c = RULE, w = 0.5, x1 = ML, x2 = W - MR) => { stroke(c, w); pdf.line(x1, yy, x2, yy) }
  const txt = (t: string, x: number, yy: number, o?: { align?: 'left' | 'right' | 'center' }) => pdf.text(t, x, yy, o)
  const need = (h: number) => { if (y + h > H - BOT) { pdf.addPage(); y = TOP } }
  const fit = (t: string, w: number) => { let s = t; while (pdf.getTextWidth(s) > w && s.length > 3) s = s.slice(0, -2); return s === t ? t : s.trimEnd() + '…' }
  const para = (t: string, size = 9, c = INK, lh = 1.55, x = ML, w = CW) => { font('normal', size, c); const ls = pdf.splitTextToSize(t, w) as string[]; need(ls.length * size * lh); ls.forEach(l => { txt(l, x, y + size); y += size * lh }) }
  const h2 = (t: string, sub?: string, keep = 100) => { need(40 + keep); y += 14; rect(ML, y, 5, 16, RED); font('bold', 12.5, INK); txt(t, ML + 13, y + 12.5); y += 24; if (sub) { para(sub, 8, MUTED, 1.5); y += 3 } }

  // ---------- kepala dokumen ----------
  pdf.addImage(logo, 'PNG', ML, y - 2, 104, 33)
  font('medium', 7.5, MUTED); txt('DIREKTORAT OPERASI', W - MR, y + 8, { align: 'right' }); font('normal', 7.5, MUTED); txt('Monitoring Pasokan PLTU', W - MR, y + 19, { align: 'right' }); y += 40
  rect(ML, y, CW, 50, OLIVE, 4); rect(ML, y, 6, 50, RED, 0)
  font('bold', 19, '#ffffff'); txt('Ringkasan Operasi Pasokan', ML + 20, y + 24); font('normal', 9, '#e6e3d2'); txt(`Bulan ${d.bulan} 2026  ·  posisi data ${d.posisi}`, ML + 20, y + 40); y += 66

  // ---------- kartu angka ----------
  const keb = d.target + d.co, sisa = Math.max(0, keb - d.ds)
  const cards: [string, string, string, string][] = [['Kebutuhan', fmtNum(keb), `konfirmasi ${fmtNum(d.target)} + CO ${fmtNum(d.co)}`, PURPLE], ['Complete Loading (B/L)', fmtNum(d.bl), `${P1(pc(d.bl, keb))} dari kebutuhan`, SKY], ['Complete Unloading (D/S)', fmtNum(d.ds), `${P1(pc(d.ds, keb))} dari kebutuhan`, GREEN], ['Sisa belum terpenuhi', fmtNum(sisa), `${P1(pc(sisa, keb))} dari kebutuhan`, ORANGE]]
  const gap = 8, cw = (CW - gap * 3) / 4
  cards.forEach(([l, v, s, c], i) => { const x = ML + i * (cw + gap); rect(x, y, cw, 62, mix(c, 0.88), 4); rect(x, y, cw, 4, c, 0); font('medium', 6.8, c === ORANGE ? '#a8500f' : c); txt(l.toUpperCase(), x + 9, y + 18); font('bold', 15.5, INK); txt(v, x + 9, y + 38); font('normal', 6.4, MUTED); txt(fit(s, cw - 14), x + 9, y + 53) })
  y += 62 + 14
  // batang gabungan
  rect(ML, y, CW, 12, '#e6e9ee', 6); const wBl = Math.min(1, d.bl / (keb || 1)) * CW, wDs = Math.min(1, d.ds / (keb || 1)) * CW
  if (wBl > 1) rect(ML, y, Math.max(wBl, 9), 12, SKY, 6); if (wDs > 1) rect(ML, y, Math.max(wDs, 9), 12, GREEN, 6)
  y += 24; rect(ML, y - 7, 8, 8, SKY, 2); font('normal', 7.5, MUTED); txt(`Sudah dimuat (B/L) ${P1(pc(d.bl, keb))}`, ML + 12, y); rect(ML + 140, y - 7, 8, 8, GREEN, 2); txt(`Sudah dibongkar (D/S) ${P1(pc(d.ds, keb))}`, ML + 152, y); rect(ML + 300, y - 7, 8, 8, '#e6e9ee', 2); txt('Kebutuhan = 100%', ML + 312, y); y += 12

  // ---------- ringkas ----------
  const jalan = d.tahap.filter(t => ['loading', 'sailing', 'tiba', 'bongkar'].includes(t.key)), nJalan = jalan.reduce((a, t) => a + t.n, 0), vJalan = jalan.reduce((a, t) => a + t.vol, 0)
  y += 8; font('normal', 9, INK); const lines = pdf.splitTextToSize(`Pasokan ${d.bulan} baru terpenuhi ${P1(pc(d.ds, keb))} dari kebutuhan ${fmtNum(keb)} MT. Saat ini ${fmtNum(nJalan)} shipment (${fmtNum(vJalan)} MT) sedang berjalan menuju PLTU, dan ${d.jumlahDiBawahAmbang} dari ${d.jumlahPltu} PLTU masih di bawah ambang pemenuhan ${d.ambang}%.`, CW - 26) as string[]
  const bh = lines.length * 13 + 14; need(bh + 6); rect(ML, y, CW, bh, '#fff6e3', 4); rect(ML, y, 4, bh, AMBER, 0); font('normal', 9, INK); lines.forEach((l, i) => txt(l, ML + 14, y + 17 + i * 13)); y += bh

  // ---------- tabel umum ----------
  type C = { h: string; w: number; r?: boolean }
  type Cell = string | number
  const table = (cols: C[], rows: Cell[][], o: { total?: Cell[]; hl?: (i: number, c: number) => string | undefined; dot?: (i: number) => string | undefined; bar?: (i: number) => { f: number; c: string } | undefined; barCol?: number } = {}) => {
    const tw = cols.reduce((a, c) => a + c.w, 0), k = CW / tw; const xs: number[] = []; let x = ML; cols.forEach(c => { xs.push(x); x += c.w * k })
    const rowH = 20; need(22 + (rows.length + (o.total ? 1 : 0)) * rowH + 6)
    const head = () => { rect(ML, y, CW, 20, OLIVE, 0); font('medium', 6.9, '#ffffff'); cols.forEach((c, i) => txt(c.h.toUpperCase(), c.r ? xs[i] + c.w * k - 6 : xs[i] + 7, y + 13, { align: c.r ? 'right' : 'left' })); y += 20 }
    head()
    const line = (r: Cell[], i: number, total = false) => {
      if (y + rowH > H - BOT) { pdf.addPage(); y = TOP; head() }
      rect(ML, y, CW, rowH, total ? '#e3e9f6' : i % 2 ? ZEBRA : '#ffffff', 0)
      const dot = !total ? o.dot?.(i) : undefined; if (dot) rect(xs[0] + 7, y + 7, 6, 6, dot, 3)
      r.forEach((v, ci) => { const c = cols[ci]; const s = String(v); const hl = !total ? o.hl?.(i, ci) : undefined; font(total ? 'bold' : ci === 0 ? 'medium' : 'normal', 8.4, hl ?? INK)
        const ox = ci === 0 && dot ? 17 : 7; const cx = c.r ? xs[ci] + c.w * k - 6 : xs[ci] + ox; const t = fit(s, c.w * k - ox - 6)
        if (o.barCol === ci && o.bar && !total) { const b = o.bar(i); if (b) { const bw = c.w * k - 14; rect(xs[ci] + 7, y + 8, bw, 4, '#e6e9ee', 2); rect(xs[ci] + 7, y + 8, Math.max(1.5, Math.min(1, b.f) * bw), 4, b.c, 2) } return }
        txt(t, cx, y + 13, { align: c.r ? 'right' : 'left' }) })
      y += rowH; hline(y, RULE, 0.3)
    }
    rows.forEach((r, i) => line(r, i)); if (o.total) line(o.total, 0, true); y += 4
  }

  // ---------- tahapan ----------
  h2('Posisi shipment per tahapan', 'Jumlah shipment dan volume di setiap tahap, dari penjadwalan sampai selesai bongkar.', d.tahap.length * 20 + 40)
  const mx = Math.max(1, ...d.tahap.map(t => t.vol)); const totN = d.tahap.reduce((a, t) => a + t.n, 0), totV = d.tahap.reduce((a, t) => a + t.vol, 0)
  table([{ h: 'Tahapan', w: 3.6 }, { h: 'Shipment', w: 1.5, r: true }, { h: 'Volume (MT)', w: 2.2, r: true }, { h: 'Proporsi volume', w: 3.8 }], d.tahap.map(t => [t.label, fmtNum(t.n), fmtNum(t.vol), '']), { dot: i => STAGE[d.tahap[i].key], bar: i => ({ f: d.tahap[i].vol / mx, c: STAGE[d.tahap[i].key] }), barCol: 3, total: ['Total', fmtNum(totN), fmtNum(totV), ''] })

  // ---------- rincian ----------
  h2('Rincian konfirmasi dan realisasi', 'Realisasi = Complete Loading (B/L) terhadap konfirmasi tiap kelompok.', 4 * 20 + 40)
  const rc = [BLUE, '#7a933e', RED]; const rt = d.rincian.reduce((a, r) => ({ k: a.k + r.konf, r: a.r + r.real }), { k: 0, r: 0 })
  table([{ h: 'Kelompok', w: 3 }, { h: 'Konfirmasi (MT)', w: 2.4, r: true }, { h: 'Realisasi B/L (MT)', w: 2.6, r: true }, { h: '%', w: 1.4, r: true }], d.rincian.map(r => [r.label, fmtNum(r.konf), fmtNum(r.real), P1(pc(r.real, r.konf))]), { dot: i => rc[i], total: ['Total', fmtNum(rt.k), fmtNum(rt.r), P1(pc(rt.r, rt.k))] })

  // ---------- wilayah ----------
  h2('Pemenuhan per wilayah', 'Persentase = D/S terhadap kebutuhan (konfirmasi + carry over) wilayah.', 8 * 20 + 40)
  const wr = d.wilayah.filter(w => w.target + w.co + w.bl + w.ds > 0)
  const tt = wr.reduce((a, w) => ({ t: a.t + w.target, c: a.c + w.co, b: a.b + w.bl, u: a.u + w.ds }), { t: 0, c: 0, b: 0, u: 0 })
  table([{ h: 'Wilayah', w: 2.8 }, { h: 'Konfirmasi', w: 2, r: true }, { h: 'Carry over', w: 1.8, r: true }, { h: 'B/L', w: 1.8, r: true }, { h: 'D/S', w: 1.8, r: true }, { h: '% D/S', w: 2.2, r: true }],
    wr.map(w => [w.nama, fmtNum(w.target), fmtNum(w.co), fmtNum(w.bl), fmtNum(w.ds), P1(pc(w.ds, w.target + w.co))]), { dot: i => REG[wr[i].nama], hl: (i, c) => c === 5 ? tone(pc(wr[i].ds, wr[i].target + wr[i].co)) : undefined, total: ['Seluruh wilayah', fmtNum(tt.t), fmtNum(tt.c), fmtNum(tt.b), fmtNum(tt.u), P1(pc(tt.u, tt.t + tt.c))] })

  // ---------- perhatian ----------
  h2('PLTU dengan sisa kebutuhan terbesar', `Diurutkan menurut sisa kebutuhan. "Dalam perjalanan" = volume yang sudah loading sampai proses bongkar tetapi belum selesai bongkar.`, d.perhatian.length * 20 + 40)
  table([{ h: 'PLTU', w: 3 }, { h: 'Wilayah', w: 2.2 }, { h: 'Kebutuhan', w: 2, r: true }, { h: 'D/S', w: 1.6, r: true }, { h: '% D/S', w: 1.6, r: true }, { h: 'Dalam perjalanan', w: 2.4, r: true }],
    d.perhatian.map(p => [p.pltu, p.wilayah, fmtNum(p.keb), fmtNum(p.ds), P1(pc(p.ds, p.keb)), fmtNum(p.jalan)]), { dot: i => REG[d.perhatian[i].wilayah], hl: (i, c) => c === 4 ? tone(pc(d.perhatian[i].ds, d.perhatian[i].keb)) : c === 5 && d.perhatian[i].jalan > 0 ? SKY : undefined })

  // ---------- kontrak ----------
  if (d.kontrak) {
    const k = d.kontrak
    h2('Kontrak dan realisasi tahun 2026', `Realisasi = Unloading (D/S) dari ${k.bulanTermuat} bulan yang termuat. Batang abu-abu = volume kontrak, batang berwarna di atasnya = realisasi.`, 9 * 24 + 90)
    const chips: [string, string, string][] = [['Volume kontrak', fmtNum(k.volume) + ' MT', `${k.jumlah} kontrak`], ['Realisasi D/S', fmtNum(k.realisasi) + ' MT', P1(pc(k.realisasi, k.volume)) + ' dari volume kontrak'], ['Belum ada realisasi', `${k.tanpaRealisasi} kontrak`, `${k.tanpaKontrakN} pemasok di luar daftar: ${fmtNum(k.tanpaKontrakMT)} MT`]]
    const cw3 = (CW - 16) / 3; chips.forEach(([l, v, s], i) => { const x = ML + i * (cw3 + 8); rect(x, y, cw3, 46, '#f0f3f8', 4); rect(x, y, 4, 46, BLUE, 0); font('medium', 6.6, BLUE); txt(l.toUpperCase(), x + 12, y + 14); font('bold', 11.5, INK); txt(fit(v, cw3 - 18), x + 12, y + 29); font('normal', 6.3, MUTED); txt(fit(s, cw3 - 18), x + 12, y + 40) }); y += 54
    const mxK = Math.max(1, ...k.pemasok.map(p => Math.max(p.kontrak, p.real)))
    const cols: C[] = [{ h: 'Pemasok', w: 2.6 }, { h: 'Kontrak vs realisasi', w: 4.2 }, { h: 'Kontrak (MT)', w: 1.9, r: true }, { h: 'Realisasi (MT)', w: 2, r: true }, { h: '%', w: 1.3, r: true }]
    const tw = cols.reduce((a, c) => a + c.w, 0), kk = CW / tw; need(22 + k.pemasok.length * 24 + 8)
    rect(ML, y, CW, 20, OLIVE, 0); font('medium', 6.9, '#ffffff'); let xx = ML; cols.forEach(c => { txt(c.h.toUpperCase(), c.r ? xx + c.w * kk - 6 : xx + 7, y + 13, { align: c.r ? 'right' : 'left' }); xx += c.w * kk }); y += 20
    k.pemasok.forEach((p, i) => { rect(ML, y, CW, 24, i % 2 ? ZEBRA : '#ffffff', 0); const over = p.real > p.kontrak; let x = ML; font('medium', 8.4, INK); txt(fit(p.nama, cols[0].w * kk - 12), x + 7, y + 15); x += cols[0].w * kk
      const bw = cols[1].w * kk - 20; rect(x + 7, y + 6, bw * p.kontrak / mxK, 12, '#cfd5de', 2); if (p.real > 0) { const rw = Math.max(1.5, bw * Math.min(p.real, p.kontrak) / mxK); rect(x + 7, y + 8, rw, 8, SKY, 2); if (over) rect(x + 7 + rw, y + 8, bw * (p.real - p.kontrak) / mxK, 8, AMBER, 2) }
      x += cols[1].w * kk; font('normal', 8.4, INK); txt(fmtNum(p.kontrak), x + cols[2].w * kk - 6, y + 15, { align: 'right' }); x += cols[2].w * kk; txt(fmtNum(p.real), x + cols[3].w * kk - 6, y + 15, { align: 'right' }); x += cols[3].w * kk
      font('bold', 8.4, over ? '#b86e00' : tone(pc(p.real, p.kontrak))); txt(P1(pc(p.real, p.kontrak)), x + cols[4].w * kk - 6, y + 15, { align: 'right' }); y += 24; hline(y, RULE, 0.3) }); y += 4
  }

  // ---------- catatan ----------
  h2('Catatan data', undefined, d.catatan.length * 26 + 20)
  font('normal', 8, MUTED); const nh = d.catatan.reduce((a, c) => a + (pdf.splitTextToSize(c, CW - 30) as string[]).length * 12 + 4, 0) + 14; need(nh)
  rect(ML, y, CW, nh, '#f5f6f2', 4); let ny = y + 14; font('normal', 8, MUTED); d.catatan.forEach(c => { rect(ML + 10, ny - 5, 3.5, 3.5, RED, 2); (pdf.splitTextToSize(c, CW - 30) as string[]).forEach(l => { txt(l, ML + 20, ny); ny += 12 }); ny += 4 }); y += nh

  // ---------- kaki halaman ----------
  const n = pdf.getNumberOfPages()
  for (let i = 1; i <= n; i++) { pdf.setPage(i); hline(H - 38, RULE, 0.5); rect(ML, H - 39, 28, 1.5, RED, 0); font('normal', 7, MUTED); txt('PT PLN Batubara Niaga  ·  Direktorat Operasi  ·  Ringkasan Operasi Pasokan ' + d.bulan + ' 2026', ML, H - 26); txt(`${i} / ${n}`, W - MR, H - 26, { align: 'right' }); if (i === n) txt(d.dibuat, ML, H - 16) }
  return pdf.output('blob')
}
