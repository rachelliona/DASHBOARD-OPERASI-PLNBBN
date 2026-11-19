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
const INK = '#23272f', MUTED = '#667085', RULE = '#d9dde3', ZEBRA = '#f5f6f2', OLIVE = '#4a4a2e', RED = '#c8312a', BLUE = '#3b5ea0', GREEN = '#3f9a2a', SKY = '#2e86c1', ORANGE = '#e8782a', PURPLE = '#8f3a96', GREY = '#8b95a5', AMBER = '#f0a030', TRACK = '#e6e9ee'
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
  const [{ jsPDF }, fR, fM, fB, logo, mark] = await Promise.all([import('jspdf'), bin(base + 'laporan/fonts/Poppins-Regular.ttf'), bin(base + 'laporan/fonts/Poppins-Medium.ttf'), bin(base + 'laporan/fonts/Poppins-Bold.ttf'), dataUrl(base + 'logo-light.png'), dataUrl(base + 'logo-mark-light.png')])
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' }); pdf.setProperties({ title: `Ringkasan Operasi Pasokan ${d.bulan} 2026`, author: 'PT PLN Batubara Niaga', subject: 'Ringkasan dashboard operasi' })
  ;([['Poppins-Regular.ttf', fR, 'normal'], ['Poppins-Medium.ttf', fM, 'medium'], ['Poppins-Bold.ttf', fB, 'bold']] as [string, Uint8Array, string][]).forEach(([n, f, st]) => { pdf.addFileToVFS(n, b64(f)); pdf.addFont(n, 'Poppins', st) })
  let y = TOP
  const col = (h: string) => pdf.setTextColor(...rgb(h)); const fill = (h: string) => pdf.setFillColor(...rgb(h)); const stroke = (h: string, w = 0.5) => { pdf.setDrawColor(...rgb(h)); pdf.setLineWidth(w) }
  const font = (st: 'normal' | 'medium' | 'bold', size: number, c = INK) => { pdf.setFont('Poppins', st); pdf.setFontSize(size); col(c) }
  const rect = (x: number, yy: number, w: number, h: number, c: string, r = 0) => { fill(c); r ? pdf.roundedRect(x, yy, w, h, r, r, 'F') : pdf.rect(x, yy, w, h, 'F') }
  const frame = (x: number, yy: number, w: number, h: number, c: string, r = 0) => { stroke(c, 0.6); r ? pdf.roundedRect(x, yy, w, h, r, r, 'S') : pdf.rect(x, yy, w, h, 'S') }
  const hline = (yy: number, c = RULE, w = 0.5, x1 = ML, x2 = W - MR) => { stroke(c, w); pdf.line(x1, yy, x2, yy) }
  const txt = (t: string, x: number, yy: number, o?: { align?: 'left' | 'right' | 'center' }) => pdf.text(t, x, yy, o)
  const fit = (t: string, w: number) => { let s = t; while (pdf.getTextWidth(s) > w && s.length > 3) s = s.slice(0, -2); return s === t ? t : s.trimEnd() + '…' }
  const pill = (x: number, yy: number, w: number, h: number, t: string, c: string, size = 8) => { rect(x, yy, w, h, c, h / 2); font('bold', size, '#ffffff'); txt(t, x + w / 2, yy + h / 2 + size * 0.34, { align: 'center' }) }
  const newPage = () => { pdf.addPage(); pdf.addImage(mark, 'PNG', ML, 22, 20, 23); font('bold', 8.5, INK); txt('Ringkasan Operasi Pasokan', ML + 28, 32); font('normal', 7.5, MUTED); txt(`${d.bulan} 2026  ·  posisi data ${d.posisi}`, ML + 28, 43); hline(54, RED, 1.2, ML, ML + 24); hline(54, RULE, 0.5, ML + 24, W - MR); y = 70 }
  const need = (h: number) => { if (y + h > H - BOT) newPage() }
  const para = (t: string, size = 8, c = MUTED, lh = 1.5) => { font('normal', size, c); const ls = pdf.splitTextToSize(t, CW) as string[]; need(ls.length * size * lh); ls.forEach(l => { txt(l, ML, y + size); y += size * lh }) }
  const h2 = (t: string, sub?: string, keep = 100) => { need(40 + keep); y += 12; rect(ML, y, 5, 16, RED); font('bold', 12.5, INK); txt(t, ML + 13, y + 12.5); y += 24; if (sub) { para(sub, 8, MUTED, 1.5); y += 4 } }
  const ring = (cx: number, cy: number, r: number, frac: number, c: string, lw: number) => { stroke(TRACK, lw); pdf.circle(cx, cy, r, 'S'); if (frac <= 0) return; stroke(c, lw); (pdf as any).setLineCap(1); const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.min(frac, 0.9999), st = Math.max(8, Math.ceil(frac * 90)); let px = cx + r * Math.cos(a0), py = cy + r * Math.sin(a0); for (let i = 1; i <= st; i++) { const a = a0 + (a1 - a0) * i / st, qx = cx + r * Math.cos(a), qy = cy + r * Math.sin(a); pdf.line(px, py, qx, qy); px = qx; py = qy }; (pdf as any).setLineCap(0) }

  // ---------- kepala dokumen ----------
  pdf.addImage(logo, 'PNG', ML, y - 2, 104, 33)
  font('medium', 7.5, MUTED); txt('DIREKTORAT OPERASI', W - MR, y + 8, { align: 'right' }); font('normal', 7.5, MUTED); txt('Monitoring Pasokan PLTU', W - MR, y + 19, { align: 'right' }); y += 40
  rect(ML, y, CW, 50, OLIVE, 4); rect(ML, y, 6, 50, RED, 0)
  font('bold', 19, '#ffffff'); txt('Ringkasan Operasi Pasokan', ML + 20, y + 24); font('normal', 9, '#e6e3d2'); txt(`Bulan ${d.bulan} 2026  ·  posisi data ${d.posisi}`, ML + 20, y + 40); y += 64

  // ---------- hero: pemenuhan ----------
  const keb = d.target + d.co, sisa = Math.max(0, keb - d.ds), pDs = pc(d.ds, keb), pBl = pc(d.bl, keb)
  rect(ML, y, CW, 118, '#f3f6fb', 6); frame(ML, y, CW, 118, '#dfe6f1', 6)
  const gcx = ML + 66, gcy = y + 59; ring(gcx, gcy, 38, (pDs ?? 0) / 100, tone(pDs), 9); font('bold', 17, INK); txt(P1(pDs), gcx, gcy + 4, { align: 'center' }); font('medium', 5.8, MUTED); txt('PEMENUHAN (D/S)', gcx, gcy + 14, { align: 'center' })
  const hx = ML + 140, hw = CW - 140 - 18
  font('normal', 8.5, MUTED); txt(`Kebutuhan ${d.bulan}`, hx, y + 24); font('bold', 22, INK); txt(fmtNum(keb), hx, y + 47); const nw = pdf.getTextWidth(fmtNum(keb)); font('medium', 9, MUTED); txt('MT', hx + nw + 5, y + 47)
  rect(hx, y + 58, hw, 12, TRACK, 6); if (d.bl > 0) rect(hx, y + 58, Math.max(9, Math.min(1, d.bl / (keb || 1)) * hw), 12, SKY, 6); if (d.ds > 0) rect(hx, y + 58, Math.max(9, Math.min(1, d.ds / (keb || 1)) * hw), 12, GREEN, 6)
  const lg: [string, string, string][] = [[SKY, 'Sudah dimuat (B/L)', `${fmtNum(d.bl)} MT · ${P1(pBl)}`], [GREEN, 'Sudah dibongkar (D/S)', `${fmtNum(d.ds)} MT · ${P1(pDs)}`], [ORANGE, 'Sisa belum terpenuhi', `${fmtNum(sisa)} MT`]]
  lg.forEach(([c, l, v], i) => { const x = hx + i * (hw / 3); rect(x, y + 82, 7, 7, c, 2); font('normal', 6.8, MUTED); txt(l, x + 11, y + 88.5); font('bold', 8, INK); txt(fit(v, hw / 3 - 6), x + 11, y + 100) })
  y += 118 + 12

  // ---------- empat kartu ----------
  const cards: [string, number, string, string][] = [['Konfirmasi bulan ini', d.target, BLUE, 'dari kebutuhan'], ['Carry over', d.co, RED, 'dari kebutuhan'], ['Complete Loading (B/L)', d.bl, SKY, 'dari kebutuhan'], ['Complete Unloading (D/S)', d.ds, GREEN, 'dari kebutuhan']]
  const gap = 8, cw = (CW - gap * 3) / 4
  cards.forEach(([l, v, c, s], i) => { const x = ML + i * (cw + gap); rect(x, y, cw, 64, mix(c, 0.9), 4); rect(x, y, cw, 4, c, 0); font('medium', 6.6, c); txt(l.toUpperCase(), x + 9, y + 18); font('bold', 15, INK); txt(fmtNum(v), x + 9, y + 38); font('normal', 6.4, MUTED); txt(`${P1(pc(v, keb))} ${s}`, x + 9, y + 53) })
  y += 64 + 12

  // ---------- ringkas ----------
  const jalan = d.tahap.filter(t => ['loading', 'sailing', 'tiba', 'bongkar'].includes(t.key)), nJalan = jalan.reduce((a, t) => a + t.n, 0), vJalan = jalan.reduce((a, t) => a + t.vol, 0)
  font('normal', 8.6, INK); const lines = pdf.splitTextToSize(`Pasokan ${d.bulan} baru terpenuhi ${P1(pDs)} dari kebutuhan ${fmtNum(keb)} MT. Saat ini ${fmtNum(nJalan)} shipment (${fmtNum(vJalan)} MT) sedang berjalan menuju PLTU, dan ${d.jumlahDiBawahAmbang} dari ${d.jumlahPltu} PLTU masih di bawah ambang pemenuhan ${d.ambang}%.`, CW - 26) as string[]
  const bh = lines.length * 12.5 + 14; need(bh + 6); rect(ML, y, CW, bh, '#fff6e3', 4); rect(ML, y, 4, bh, AMBER, 0); font('normal', 8.6, INK); lines.forEach((l, i) => txt(l, ML + 14, y + 16.5 + i * 12.5)); y += bh

  // ---------- tahapan ----------
  h2('Posisi shipment per tahapan', 'Jumlah shipment dan volume di setiap tahap, dari penjadwalan sampai selesai bongkar.', 150)
  const totN = d.tahap.reduce((a, t) => a + t.n, 0), totV = d.tahap.reduce((a, t) => a + t.vol, 0)
  let sx = ML; d.tahap.forEach(t => { const w = totV > 0 ? t.vol / totV * CW : 0; if (w > 0) { rect(sx, y, w, 14, STAGE[t.key], 0); if (w > 26) { font('bold', 7, '#ffffff'); txt(`${Math.round(t.vol / totV * 100)}%`, sx + w / 2, y + 9.8, { align: 'center' }) } sx += w } }); y += 14 + 10
  const tcw = (CW - 16) / 3
  d.tahap.forEach((t, i) => { const x = ML + (i % 3) * (tcw + 8), yy = y + Math.floor(i / 3) * 52; rect(x, yy, tcw, 46, '#ffffff', 4); frame(x, yy, tcw, 46, RULE, 4); rect(x, yy + 6, 3.5, 34, STAGE[t.key], 0); font('medium', 7.4, INK); txt(fit(t.label, tcw - 20), x + 12, yy + 14); font('bold', 14, STAGE[t.key] === GREY ? '#5c6676' : STAGE[t.key]); txt(fmtNum(t.n), x + 12, yy + 32); const w2 = pdf.getTextWidth(fmtNum(t.n)); font('normal', 6.8, MUTED); txt('shipment', x + 12 + w2 + 4, yy + 32); txt(`${fmtNum(t.vol)} MT`, x + 12, yy + 42) })
  y += Math.ceil(d.tahap.length / 3) * 52 + 2; font('medium', 7.4, MUTED); txt(`Total ${fmtNum(totN)} shipment · ${fmtNum(totV)} MT`, W - MR, y + 6, { align: 'right' }); y += 12

  // ---------- rincian ----------
  h2('Rincian konfirmasi dan realisasi', 'Realisasi = Complete Loading (B/L) terhadap konfirmasi tiap kelompok.', 150)
  const rc = [BLUE, '#7a933e', RED], rcw = (CW - 16) / 3, rt = d.rincian.reduce((a, r) => ({ k: a.k + r.konf, r: a.r + r.real }), { k: 0, r: 0 })
  d.rincian.forEach((r, i) => { const x = ML + i * (rcw + 8), c = rc[i]; rect(x, y, rcw, 22, c, 4); rect(x, y + 12, rcw, 10, c, 0); font('bold', 9.5, '#ffffff'); txt(r.label.toUpperCase(), x + rcw / 2, y + 15, { align: 'center' }); rect(x, y + 22, rcw, 64, mix(c, 0.92), 0)
    font('normal', 6.6, MUTED); txt('Konfirmasi (MT)', x + 10, y + 36); font('bold', 11.5, INK); txt(fmtNum(r.konf), x + 10, y + 50); font('normal', 6.6, MUTED); txt('Realisasi B/L (MT)', x + 10, y + 65); font('bold', 11.5, INK); txt(fmtNum(r.real), x + 10, y + 79); pill(x + rcw - 52, y + 62, 44, 18, P1(pc(r.real, r.konf)), c, 7.6) })
  y += 92 + 8
  const tw2 = (CW - 8) / 2
  rect(ML, y, tw2, 20, '#5486e8', 4); rect(ML, y + 10, tw2, 10, '#5486e8', 0); font('bold', 7.8, '#ffffff'); txt('TOTAL KONFIRMASI + CARRY OVER (MT)', ML + tw2 / 2, y + 13.5, { align: 'center' }); rect(ML, y + 20, tw2, 30, '#e8efff', 0); font('bold', 16, '#1f3864'); txt(fmtNum(rt.k), ML + tw2 / 2, y + 41, { align: 'center' })
  const x2 = ML + tw2 + 8; rect(x2, y, tw2, 20, AMBER, 4); rect(x2, y + 10, tw2, 10, AMBER, 0); font('bold', 7.8, '#ffffff'); txt('TOTAL REALISASI (MT)', x2 + tw2 / 2, y + 13.5, { align: 'center' }); rect(x2, y + 20, tw2 - 62, 30, '#fff3e0', 0); font('bold', 16, '#8a4a14'); txt(fmtNum(rt.r), x2 + (tw2 - 62) / 2, y + 41, { align: 'center' }); rect(x2 + tw2 - 58, y + 20, 58, 30, '#c77a10', 0); font('bold', 12, '#ffffff'); txt(P1(pc(rt.r, rt.k)), x2 + tw2 - 29, y + 39.5, { align: 'center' })
  y += 56

  // ---------- wilayah ----------
  const wr = d.wilayah.filter(w => w.target + w.co + w.bl + w.ds > 0)
  h2('Pemenuhan per wilayah', 'Batang biru muda = sudah dimuat (B/L), batang berwarna = sudah dibongkar (D/S), terhadap kebutuhan wilayah (konfirmasi + carry over).', Math.ceil(wr.length / 3) * 86 + 20)
  const wcw = (CW - 16) / 3
  wr.forEach((w, i) => { const x = ML + (i % 3) * (wcw + 8), yy = y + Math.floor(i / 3) * 92; const kb = w.target + w.co, pd = pc(w.ds, kb), pb = pc(w.bl, kb)
    rect(x, yy, wcw, 84, '#ffffff', 4); frame(x, yy, wcw, 84, RULE, 4); rect(x, yy, wcw, 4, REG[w.nama] ?? GREY, 0)
    font('bold', 9.5, INK); txt(w.nama, x + 10, yy + 20); font('bold', 14, tone(pd)); txt(P1(pd), x + wcw - 10, yy + 21, { align: 'right' })
    rect(x + 10, yy + 29, wcw - 20, 6, TRACK, 3); if (pb) rect(x + 10, yy + 29, Math.max(3, Math.min(1, pb / 100) * (wcw - 20)), 6, mix(SKY, 0.55), 3); if (pd) rect(x + 10, yy + 29, Math.max(3, Math.min(1, pd / 100) * (wcw - 20)), 6, tone(pd), 3)
    ;([['Kebutuhan', fmtNum(kb)], ['Dimuat (B/L)', fmtNum(w.bl)], ['Dibongkar (D/S)', fmtNum(w.ds)]] as [string, string][]).forEach(([l, v], j) => { font('normal', 6.6, MUTED); txt(l, x + 10, yy + 48 + j * 12); font('medium', 7.8, INK); txt(v + ' MT', x + wcw - 10, yy + 48 + j * 12, { align: 'right' }) }) })
  y += Math.ceil(wr.length / 3) * 92

  // ---------- perhatian ----------
  h2('PLTU dengan sisa kebutuhan terbesar', 'Diurutkan menurut sisa kebutuhan. Panjang batang = kebutuhan PLTU.', d.perhatian.length * 27 + 50)
  { const lx = ML; ([[GREEN, 'Sudah dibongkar (D/S)'], [SKY, 'Dalam perjalanan (loading sampai proses bongkar)'], [TRACK, 'Belum berjalan']] as [string, string][]).reduce((x, [c, l]) => { rect(x, y, 8, 8, c, 2); font('normal', 7, MUTED); txt(l, x + 12, y + 7); return x + 12 + pdf.getTextWidth(l) + 16 }, lx); y += 16 }
  const mxK = Math.max(1, ...d.perhatian.map(p => p.keb)), bx = ML + 120, bwMax = CW - 120 - 96
  d.perhatian.forEach((p, i) => { need(27); if (i % 2 === 0) rect(ML, y, CW, 27, ZEBRA, 0)
    rect(ML + 8, y + 10, 6, 6, REG[p.wilayah] ?? GREY, 3); font('medium', 8.4, INK); txt(fit(p.pltu, 98), ML + 20, y + 16)
    const tw = bwMax * p.keb / mxK; rect(bx, y + 9, tw, 9, TRACK, 2); const wd = Math.min(tw, bwMax * p.ds / mxK), wj = Math.min(tw - wd, bwMax * p.jalan / mxK); if (wj > 0) rect(bx + wd, y + 9, wj, 9, SKY, 0); if (wd > 0) rect(bx, y + 9, Math.max(1.5, wd), 9, GREEN, 2)
    font('bold', 8.6, tone(pc(p.ds, p.keb))); txt(P1(pc(p.ds, p.keb)), W - MR - 8, y + 12, { align: 'right' }); font('normal', 6.4, MUTED); txt(`${fmtNum(p.ds)} / ${fmtNum(p.keb)} MT`, W - MR - 8, y + 22, { align: 'right' }); y += 27 })
  y += 6

  // ---------- kontrak ----------
  if (d.kontrak) {
    const k = d.kontrak
    h2('Kontrak dan realisasi tahun 2026', `Realisasi = Unloading (D/S) dari ${k.bulanTermuat} bulan yang termuat. Batang abu-abu = volume kontrak, batang berwarna di atasnya = realisasi.`, 9 * 24 + 100)
    const chips: [string, string, string][] = [['Volume kontrak', fmtNum(k.volume) + ' MT', `${k.jumlah} kontrak`], ['Realisasi D/S', fmtNum(k.realisasi) + ' MT', P1(pc(k.realisasi, k.volume)) + ' dari volume kontrak'], ['Belum ada realisasi', `${k.tanpaRealisasi} kontrak`, `${k.tanpaKontrakN} pemasok di luar daftar: ${fmtNum(k.tanpaKontrakMT)} MT`]]
    const cw3 = (CW - 16) / 3; chips.forEach(([l, v, s], i) => { const x = ML + i * (cw3 + 8); rect(x, y, cw3, 46, '#f0f3f8', 4); rect(x, y, 4, 46, BLUE, 0); font('medium', 6.6, BLUE); txt(l.toUpperCase(), x + 12, y + 14); font('bold', 11.5, INK); txt(fit(v, cw3 - 18), x + 12, y + 29); font('normal', 6.3, MUTED); txt(fit(s, cw3 - 18), x + 12, y + 40) }); y += 54
    const mxC = Math.max(1, ...k.pemasok.map(p => Math.max(p.kontrak, p.real))); const cols = [2.6, 4.2, 1.9, 2, 1.3], tw = cols.reduce((a, c) => a + c, 0), kk = CW / tw
    rect(ML, y, CW, 20, OLIVE, 0); font('medium', 6.9, '#ffffff'); let xx = ML; ;['Pemasok', 'Kontrak vs realisasi', 'Kontrak (MT)', 'Realisasi (MT)', '%'].forEach((h, i) => { txt(h.toUpperCase(), i > 1 ? xx + cols[i] * kk - 6 : xx + 7, y + 13, { align: i > 1 ? 'right' : 'left' }); xx += cols[i] * kk }); y += 20
    k.pemasok.forEach((p, i) => { need(24); rect(ML, y, CW, 24, i % 2 ? ZEBRA : '#ffffff', 0); const over = p.real > p.kontrak; let x = ML; font('medium', 8.4, INK); txt(fit(p.nama, cols[0] * kk - 12), x + 7, y + 15); x += cols[0] * kk
      const bw = cols[1] * kk - 20; rect(x + 7, y + 6, bw * p.kontrak / mxC, 12, '#cfd5de', 2); if (p.real > 0) { const rw = Math.max(1.5, bw * Math.min(p.real, p.kontrak) / mxC); rect(x + 7, y + 8, rw, 8, SKY, 2); if (over) rect(x + 7 + rw, y + 8, bw * (p.real - p.kontrak) / mxC, 8, AMBER, 2) }
      x += cols[1] * kk; font('normal', 8.4, INK); txt(fmtNum(p.kontrak), x + cols[2] * kk - 6, y + 15, { align: 'right' }); x += cols[2] * kk; txt(fmtNum(p.real), x + cols[3] * kk - 6, y + 15, { align: 'right' }); x += cols[3] * kk
      font('bold', 8.4, over ? '#b86e00' : tone(pc(p.real, p.kontrak))); txt(P1(pc(p.real, p.kontrak)), x + cols[4] * kk - 6, y + 15, { align: 'right' }); y += 24; hline(y, RULE, 0.3) }); y += 4
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
