import type { El, Slide } from './scene'
import type { KpiTahunan } from './kpi'
import { fmtNum } from '../domain/format'
import { REGIONS } from '../domain/status'
import { kebutuhan, pct } from '../domain/kpi'
import { compactSumber } from '../domain/view'
export { compactSumber }

export type DeckIn = { bulan: string; updateTxt: string; plants: any[]; ships: any[]; month: { carry: number; konf: number; bl: number; ds: number }; ytd: { bl: number; ds: number }; real: (number | null)[]; activeIdx: number; kpi: KpiTahunan }
const C = { co: '#ff0000', loading: '#1fa2ff', sailing: '#ed7d31', tiba: '#1f3864', bongkar: '#a63fa6', unloading: '#4ea72e', terjadwal: '#a6a6a6', lain: '#d4d4d4' }
const SER: [string, string, string][] = [['carryOver', 'Carry Over', C.co], ['loading', 'Loading', C.loading], ['sailing', 'Sailing', C.sailing], ['tiba', 'Tiba/Antri', C.tiba], ['bongkar', 'Proses Bongkar', C.bongkar], ['unloading', 'Unloading', C.unloading], ['terjadwal', 'Sudah Ada Jadwal Muat', C.terjadwal], ['lain', 'Belum ada status', C.lain]]
const GREEN = '#2f8f2f'
let _cx: CanvasRenderingContext2D | null | undefined
export function measure(t: string, size: number, bold = false, italic = false) {
  if (_cx === undefined) { try { _cx = document.createElement('canvas').getContext('2d') } catch { _cx = null } }
  if (!_cx) return t.length * size * 0.6
  _cx.font = `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px Poppins, Arial, sans-serif`; return _cx.measureText(t).width
}
/** Singkat teks sumber tambang agar muat utuh di kotak: tingkat penyingkatan bertahap (tanpa "ft"/"MT"), 1 baris lalu 2 baris, ukuran huruf mengecil; terpotong hanya sebagai jalan terakhir. */
export function fitSumber(t: string, size: number, maxW: number, maxH = 0): { s: string; size: number } {
  if (!t) return { s: '', size }
  const sizes = [size, size - 1, size - 2, size - 3].filter(v => v >= 6.5)
  const twoOk = maxH >= 19
  for (let lv = 0; lv <= 3; lv++) {
    const c = compactSumber(t, lv)
    for (const sz of sizes) if (measure(c, sz) <= maxW) return { s: c, size: sz }
    if (twoOk) for (const sz of sizes.filter(v => v * 2.5 <= maxH)) {
      const parts = c.split(/,\s*/); let best: string | null = null
      for (let k = 1; k < parts.length; k++) { const a = parts.slice(0, k).join(', ') + ',', b = parts.slice(k).join(', '); if (measure(a, sz) <= maxW && measure(b, sz) <= maxW) { best = a + '\n' + b; break } }
      if (best) return { s: best, size: sz }
    }
  }
  const sz = Math.max(6.5, sizes[sizes.length - 1] ?? 6.5), c = compactSumber(t, 3)
  if (twoOk) { const w = c.split(' '); let a = '', i = 0; while (i < w.length && measure((a + ' ' + w[i]).trim(), sz) <= maxW) a = (a + ' ' + w[i++]).trim(); let b = w.slice(i).join(' ')
    if (measure(b, sz) <= maxW) return { s: a + '\n' + b, size: sz }
    while (b.length > 3 && measure(b + '…', sz) > maxW) b = b.slice(0, -1).trimEnd(); return { s: a + '\n' + b + '…', size: sz } }
  let x = c; while (x.length > 4 && measure(x + '…', sz) > maxW) x = x.slice(0, -1).trimEnd(); return { s: x + '…', size: sz }
}
const n0 = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(v))
const pc0 = (v: number | null) => v == null || !isFinite(v) ? '—' : Math.round(v) + '%'
const bg = (): El => ({ t: 'img', x: 0, y: 0, w: 1280, h: 720, src: 'bg' })
const T = (x: number, y: number, w: number, h: number, s: string, size: number, o: Partial<Extract<El, { t: 'text' }>> = {}): El => { const mw = s.includes('\n') ? 0 : measure(s, size, o.bold, o.italic); return { t: 'text', x, y, w, h, s, size: mw > w - 2 && w > 20 ? Math.max(6, +(size * (w - 2) / mw).toFixed(1)) : size, ...o } }
const R = (x: number, y: number, w: number, h: number, fill: string, o: Partial<Extract<El, { t: 'rect' }>> = {}): El => ({ t: 'rect', x, y, w, h, fill, r: 6, ...o })
const S = (x: number, y: number, w: number, h: number, fill: string, o: Partial<Extract<El, { t: 'rect' }>> = {}): El => R(x, y, w, h, fill, { r: 0, ...o })
const title = (u: string): El => T(32, 38, 800, 44, `UPDATE ${u}`, 30, { bold: true, va: 'm' })

function slide1(d: DeckIn): Slide {
  const k = d.kpi, els: El[] = [bg(), title(d.updateTxt)]
  els.push(S(11, 88, 1258, 44, '#4a4a2e'), T(11, 88, 1258, 44, 'DASHBOARD MONITORING KINERJA OPERASI PLN BATUBARA', 24, { color: '#fff', align: 'c', va: 'm' }))
  els.push(R(11, 139, 511, 28, '#dcd7c3'), T(11, 139, 511, 28, 'Annual KPI card', 15, { bold: true, align: 'c', va: 'm', color: '#333' }))
  const big = (y: number, lh: number, vh: number, lab: string, v: string, lc: string, vc: string) => { els.push(R(11, y, 511, lh, lc), T(11, y, 511, lh, lab, 15, { color: '#fff', align: 'c', va: 'm' }), R(11, y + lh, 511, vh, vc), T(11, y + lh, 511, vh, v, 46, { color: '#fff', align: 'c', va: 'm' })) }
  big(173, 25, 56, 'Rencana', n0(k.rencana), '#a99ccb', '#5c4a78'); big(259, 26, 43, 'Target RKAP', n0(k.targetRkap), '#9bd3de', '#4a8a9a'); big(335, 21, 57, 'Terkontrak', n0(k.terkontrak), '#5b86d0', '#3b5ea0')
  const blok = (x: number, tt: string, bgc: string, ital: boolean, a: number, ar: number, b: number, bp: number | null) => {
    els.push(R(x, 419, 253, 142, bgc), T(x, 421, 253, 18, tt, 12.5, { bold: true, italic: ital, align: 'c', va: 'm' }),
      R(x + 4, 442, 245, 21, '#f4c09a'), T(x + 4, 442, 245, 21, 'Terkontrak', 13, { color: '#fff', align: 'c', va: 'm' }),
      R(x + 4, 463, 245, 33, '#d9772a'), T(x + 4, 463, bp == null ? 245 : 170, 33, n0(a), 26, { color: '#fff', bold: true, align: 'c', va: 'm' }),
      R(x + 4, 502, 245, 19, '#c9d9a0'), T(x + 4, 502, 245, 19, 'Realisasi', 13, { color: '#fff', align: 'c', va: 'm' }),
      R(x + 4, 521, 245, 34, '#7a933e'), T(x + 4, 521, 170, 34, n0(b), 26, { color: '#fff', bold: true, align: 'c', va: 'm' }),
      R(x + 176, 521, 73, 34, '#4d5f25'), T(x + 176, 521, 73, 34, pc0(bp), 20, { color: '#fff', bold: true, italic: true, align: 'c', va: 'm' }))
    if (ar >= 0) { els.push(R(x + 176, 463, 73, 33, '#8a4a14'), T(x + 176, 463, 73, 33, pc0(ar), 20, { color: '#fff', bold: true, italic: true, align: 'c', va: 'm' })) }
  }
  blok(11, 'Volume  RKAP', '#e3dcea', false, k.rkapTerkontrak, pct(k.rkapTerkontrak, k.targetRkap) ?? -1, k.rkapRealisasi, pct(k.rkapRealisasi, k.targetRkap))
  blok(266, 'Proaktif Sourcing', '#f0dcdc', true, k.proaktifTerkontrak, -1, k.proaktifRealisasi, pct(k.proaktifRealisasi, k.proaktifTerkontrak))
  els.push(R(11, 569, 517, 20, '#e8e5d9'), T(11, 569, 517, 20, 'Total (Target + Proaktif) RKAP', 12.5, { bold: true, align: 'c', va: 'm', color: '#444' }))
  const tReal = k.totalRealisasi || k.rkapRealisasi + k.proaktifRealisasi
  els.push(R(11, 592, 248, 56, '#3b5ea0'), R(11, 592, 248, 19, '#5b86d0'), T(11, 592, 248, 19, 'Terkontrak', 13, { color: '#fff', align: 'c', va: 'm' }), T(11, 611, 248, 37, n0(k.terkontrak), 28, { color: '#fff', align: 'c', va: 'm' }),
    R(266, 592, 262, 56, '#595959'), R(266, 592, 262, 19, '#7f7f7f'), T(266, 592, 262, 19, 'Realisasi', 13, { color: '#fff', align: 'c', va: 'm' }), T(266, 611, 180, 37, n0(tReal), 28, { color: '#fff', align: 'c', va: 'm' }), R(450, 611, 78, 37, '#262626'), T(450, 611, 78, 37, pc0(pct(tReal, k.targetRkap)), 20, { color: '#fff', bold: true, italic: true, align: 'c', va: 'm' }))
  // grafik
  const X0 = 590, Y0 = 190, CW = 660, CH = 380, MAXV = 16
  els.push(T(545, 140, 715, 22, 'Perbandingan Realisasi 2025, Target, Prognosa, dan Realisasi Bulanan Tahun 2026 (Juta MT)', 13, { bold: true, align: 'c', va: 'm', color: '#333' }), R(546, 166, 714, 462, '#ffffff', { stroke: '#d0d0d0' }))
  for (let v = 0; v <= MAXV; v += 2) { const y = Y0 + CH - v / MAXV * CH; els.push({ t: 'line', x1: X0, y1: y, x2: X0 + CW, y2: y, color: v ? '#e3e3e3' : '#999', w: 1 }, T(X0 - 34, y - 8, 28, 16, String(v), 9.5, { align: 'r', va: 'm', color: '#555' })) }
  const BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']; const gw = CW / 12, bw = 15
  BL.forEach((m, i) => {
    const gx = X0 + i * gw + (gw - bw * 3 - 3) / 2; const real = k.realisasi?.[i] ?? null; const prog = k.prognosa[i]
    const vals: [number | null, string][] = [[k.y2025[i], '#4472c4'], [k.target[i], '#c0504d'], [real ?? prog, real != null ? '#9bbb59' : '#a6a6a6']]
    vals.forEach(([v, c], j) => { if (v == null) return; const h = v / MAXV * CH; const x = gx + j * (bw + 1.5); els.push(S(x, Y0 + CH - h, bw, h, c), T(x - 8, Y0 + CH - h - 14, bw + 16, 12, v >= 10 ? v.toFixed(2).replace(/0$/, '') : String(+v.toFixed(2)), 7.5, { bold: true, align: 'c', va: 'm', color: '#222' })) })
    els.push(T(X0 + i * gw, Y0 + CH + 3, gw, 14, m, 9.5, { align: 'c', va: 'm', color: '#444' }))
  })
  ;[['2025', '#4472c4'], ['Target', '#c0504d'], ['Realisasi', '#9bbb59'], ['Prognosa', '#a6a6a6']].forEach(([l, c], i) => els.push(S(760 + i * 95, 600, 9, 9, c), T(773 + i * 95, 595, 80, 18, l, 10, { va: 'm', color: '#444' })))
  return { name: 'KPI Tahunan', els }
}

function slide2(d: DeckIn): Slide {
  const els: El[] = [bg(), title(d.updateTxt)]; const cnt = (k: string) => d.ships.filter(s => s.status === k).length
  els.push(T(30, 168, 170, 40, '<< 2025', 18, { bold: true, align: 'c', va: 'm' }), R(217, 152, 833, 88, '#2a5bd0', { r: 8 }), T(217, 152, 833, 88, 'DASHBOARD MONITORING PASOKAN\nPT PLN BATUBARA NIAGA TAHUN 2026', 27, { bold: true, color: '#fff', align: 'c', va: 'm' }))
  els.push(R(1072, 180, 197, 32, '#9c1c14', { r: 6 }), T(1072, 180, 170, 32, d.bulan.toUpperCase(), 19, { bold: true, color: '#fff', align: 'c', va: 'm' }), T(1236, 180, 30, 32, '▼', 11, { color: '#fff', align: 'c', va: 'm' }))
  const BX: [string, string, string][] = [['Sudah Ada\nJadwal Muat', 'terjadwal', ''], ['Proses\nLoading', 'loading', ''], ['Selesai\nMuat/Sailing', 'sailing', ''], ['Tiba/Antri\nJetty PLTU', 'tiba', ''], ['Proses\nBongkar', 'bongkar', ''], ['Selesai\nBongkar', 'unloading', '']]
  BX.forEach(([lab, k], i) => { const x = [5, 217, 430, 650, 854, 1063][i]; els.push(R(x, 252, 202, 58, '#d4dee3'), T(x, 252, 202, 58, lab, 18.5, { align: 'c', va: 'm', color: '#222' }), R(x, 312, 202, 53, '#4a9db5'), T(x, 312, 202, 53, String(cnt(k)), 42, { bold: true, color: '#fff', align: 'c', va: 'm' }), R(x, 366, 202, 31, '#1b3f66'), T(x, 366, 202, 31, 'NOMINASI', 15, { bold: true, color: '#fff', align: 'c', va: 'm' })) })
  const kb = d.month.carry + d.month.konf; const bm = d.bulan.toUpperCase()
  const box = (x: number, w: number, fill: string, lab: string, v: string, pBg?: string, pv?: string) => els.push(R(x, 411, w, 70, fill), T(x + 4, 413, w - 8, 20, lab, 13.5, { color: '#fff', align: 'c', va: 'm' }), T(x, 433, pv ? w - 78 : w, 46, v, 36, { color: '#fff', bold: true, align: 'c', va: 'm' }), ...(pv ? [R(x + w - 78, 436, 78, 40, pBg!), T(x + w - 78, 436, 78, 40, pv, 22, { color: '#fff', bold: true, italic: true, align: 'c', va: 'm' })] : []))
  box(5, 308, '#9c1c14', `Carry Over ${bm} (MT)`, fmtNum(d.month.carry)); box(318, 318, '#4f8a96', `Konfirmasi Pasokan ${bm} (MT)`, fmtNum(d.month.konf))
  box(640, 308, '#a0507a', `Complete Loading ${bm} (MT)`, fmtNum(d.month.bl), '#6e2a52', pc0(pct(d.month.bl, kb))); box(952, 322, '#5b4a9a', `Complete Unloading ${bm} (MT)`, fmtNum(d.month.ds), '#3f2f76', pc0(pct(d.month.ds, kb)))
  const T26 = d.kpi.targetRkap, YD = d.kpi.ytdPembagi || T26
  els.push(R(5, 488, 631, 84, '#5486e8'), T(5, 490, 631, 26, 'TOTAL COMPLETE LOADING 2026 (MT)', 21, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }), T(5, 514, 450, 58, fmtNum(d.kpi.ytdBlManual || d.ytd.bl), 52, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }), R(440, 516, 196, 56, '#2a4a9a'), T(440, 516, 196, 56, (pct(d.kpi.ytdBlManual || d.ytd.bl, YD) ?? 0).toFixed(2).replace('.', ',') + '%', 34, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }))
  els.push(R(640, 488, 634, 84, '#f0a030'), T(640, 490, 634, 26, 'TOTAL COMPLETE UNLOADING 2026 (MT)', 21, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }), T(640, 514, 450, 58, fmtNum(d.kpi.ytdDsManual || d.ytd.ds), 52, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }), R(1075, 516, 199, 56, '#a8681e'), T(1075, 516, 199, 56, (pct(d.kpi.ytdDsManual || d.ytd.ds, YD) ?? 0).toFixed(2).replace('.', ',') + '%', 34, { italic: true, bold: true, color: '#fff', align: 'c', va: 'm' }))
  els.push(T(5, 580, 1270, 16, `% bulanan terhadap Konfirmasi + Carry Over bulan ${d.bulan}; % total 2026 terhadap ${fmtNum(YD)} MT (pembagi sesuai sheet DASHBOARD). Jumlah nominasi dihitung per baris shipment pada sheet bulan ${d.bulan}.`, 9.5, { color: '#555', italic: true, align: 'c' }))
  return { name: 'Monitoring Pasokan', els }
}

function nice(max: number) { const st = [5000, 10000, 20000, 25000, 50000, 100000, 200000]; const s = st.find(v => max / v <= 9) ?? 500000; return { step: s, top: Math.max(s, Math.ceil(max / s) * s) } }
function region(d: DeckIn, reg: string): Slide {
  const els: El[] = [bg()]; const rows = d.plants.filter(r => r.wilayah === reg).map(r => ({ r, keb: kebutuhan(r), tot: SER.reduce((a, s) => a + (r[s[0]] ?? 0), 0), txt: r.__sumber as string }))
  els.push(T(32, 30, 900, 34, 'UPDATE MONITORING PASOKAN PLTU', 27, { bold: true, va: 'm' }), T(32, 62, 900, 26, `PT PLN BATUBARA NIAGA (${d.updateTxt})`, 19, { bold: true, color: GREEN, va: 'm' }), T(740, 28, 290, 46, reg.toUpperCase(), 33, { bold: true, italic: true, color: GREEN, align: 'r', va: 'm' }), { t: 'img', x: 1184, y: 63, w: 62, h: 48, src: 'kapal' })
  const n = Math.max(rows.length, 1); const top = 99, pitch = Math.min(48, 480 / n), BH = Math.min(25, pitch * 0.72), X0 = 259, PW = 557, LX = 16, LW = 100
  const mx = Math.max(1, ...rows.map(r => r.tot)); const { step, top: AX } = nice(mx); const sc = PW / AX
  els.push(R(905, 95, 348, 503, 'none', { stroke: '#2f6f4f', dash: true, sw: 1, r: 10 }), T(930, 598, 300, 22, 'Sumber Tambang', 14, { bold: true, color: GREEN, align: 'c', va: 'm' }))
  rows.forEach(({ r, keb, tot, txt }, i) => {
    const cy = top + pitch * (i + 0.5); const y = cy - BH / 2
    els.push(T(120, cy - 10, 134, 20, r.pltu, r.pltu.length > 17 ? 9 : 11, { align: 'r', va: 'm', color: '#222' }))
    // kiri: komposisi terhadap kebutuhan
    els.push(R(LX, y, LW, BH, '#d9d9d9', { r: 3 })); let lx = LX
    if (keb > 0) for (const s of SER.slice(0, 6)) { const v = r[s[0]] ?? 0; if (!v) continue; const w = Math.min(LX + LW - lx, v / keb * LW); if (w > 0.5) { els.push(S(lx, y, w, BH, s[2])); lx += w } }
    els.push(T(LX, y, LW - 3, BH, keb > 0 ? fmtNum(keb) : '0', 11, { bold: true, align: 'r', va: 'm', color: '#111' }))
    // kanan: volume per tahapan
    let x = X0; for (const s of SER) { const v = r[s[0]] ?? 0; if (!v) continue; const w = v * sc; els.push(S(x, y, w, BH, s[2])); if (measure(fmtNum(v), 10, true) + 6 < w) els.push(T(x, y, w, BH, fmtNum(v), 10, { bold: true, align: 'c', va: 'm', color: s[0] === 'terjadwal' || s[0] === 'lain' ? '#222' : '#fff' })); x += w }
    const bx = 923, bwid = 317, bh = Math.min(26, pitch * 0.76)
    els.push({ t: 'line', x1: Math.max(X0 + 2, x + 3), y1: cy, x2: bx - 4, y2: cy, w: 1, arrows: true }, R(bx, cy - bh / 2, bwid, bh, '#ffffff', { stroke: '#8a8a8a', r: 6 }), (() => { const f = fitSumber(txt || '', 9.5, bwid - 14, bh); return T(bx + 4, cy - bh / 2, bwid - 8, bh, f.s, f.size, { va: 'm', color: '#222' }) })())
  })
  for (let v = 0; v <= AX; v += step) { const x = X0 + v * sc; els.push(T(x - 28, 590, 56, 12, fmtNum(v), 8, { align: 'c', color: '#666' })) }
  ;[0, 50, 100].forEach(p => els.push(T(LX + LW * p / 100 - 18, 590, 36, 12, p + '%', 8, { align: 'c', color: '#666' })))
  els.push(T(8, 606, 150, 16, 'Persentase', 13, { bold: true, color: GREEN, align: 'c' }), T(8, 621, 150, 14, '(pemenuhan pasokan)', 8.5, { color: GREEN, align: 'c' }))
  SER.forEach(([, l, c], i) => { const lx = 190 + [0, 78, 138, 198, 272, 375, 463, 595][i]; els.push(S(lx, 628, 8, 8, c), T(lx + 11, 624, 130, 16, l, 8.5, { va: 'm', color: '#555' })) })
  const cn = (k: string) => d.ships.filter(s => s.wilayah === reg && s.status === k).length
  els.push({ t: 'img', x: 428, y: 677, w: 66, h: 48, src: 'batubara' })
  ;([['terjadwal', 'terjadwal', '#111', false], ['loading', 'loading', '#2e75b6', true], ['sailing', 'sailing', '#ed7d31', true], ['tiba', 'sandar', '#111', false], ['bongkar', 'bongkar', GREEN, false]] as [string, string, string, boolean][]).forEach(([k, l, c, it], i) => { const x = 487 + i * 99; els.push(T(x - 7, 641, 107, 24, l, 15, { bold: true, italic: it, color: c, align: 'c', va: 'm' }), R(x, 667, 93, 35, '#ffffff', { stroke: '#222', sw: 1.6, r: 8 }), T(x, 667, 93, 35, String(cn(k)), 26, { bold: true, align: 'c', va: 'm' })) })
  return { name: reg, els }
}
export function buildDeck(d: DeckIn): Slide[] { return [slide1(d), slide2(d), ...REGIONS.map(r => region(d, r))] }
