import { jsPDF } from 'jspdf'
import { DRow, kategori, skorEta, skorShort } from '../domain/durasi'
import { QShip, avg, skorMutu } from '../domain/kualitas'
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const fd = (t: number | null) => t == null ? '' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }).format(t)
const f0 = (n: number | null) => n == null ? '' : Math.round(n).toLocaleString('id-ID'); const f1 = (n: number | null) => n == null ? '' : n.toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 }); const f2 = (n: number | null) => n == null ? '' : n.toLocaleString('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
export const TW = (q: number, y: number) => `TW ${['I', 'II', 'III', 'IV'][q - 1]} ${y}`
export const inTW = (t: number | null, q: number, y: number) => { if (t == null) return false; const d = new Date(t); return d.getUTCFullYear() === y && Math.floor(d.getUTCMonth() / 3) + 1 === q }
type Col = { h: string; w: number; a?: 'l' | 'r' | 'c' }
function kop(doc: jsPDF, judul: string, sub: string) {
  const W = doc.internal.pageSize.getWidth(); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.rect(10, 8, W - 20, 17)
  doc.text('PT PLN BATUBARA NIAGA', 14, 14); doc.setFontSize(11); doc.text(judul, W / 2, 15, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
  doc.text(['No. Dok : 011/SOP/PLNBBN/2025', 'Tanggal Penerbitan : 1 Oktober 2025', 'Berlaku Sejak : 1 Oktober 2025', 'Edisi/Revisi : 01/00'], W - 12, 11.5, { align: 'right', lineHeightFactor: 1.15 })
  doc.setFontSize(8); doc.text(sub, 10, 31)
}
function tabel(doc: jsPDF, cols: Col[], rows: string[][], y0: number, onPage: () => number, tebal?: (i: number) => boolean) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(); const tot = cols.reduce((a, c) => a + c.w, 0), k = (W - 20) / tot; let y = y0
  const head = () => { doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3); doc.setFillColor(226, 232, 240); let x = 10; const hh = 8; doc.rect(10, y, W - 20, hh, 'F'); for (const c of cols) { const w = c.w * k; doc.rect(x, y, w, hh); doc.text(c.h, x + w / 2, y + 4.6, { align: 'center', maxWidth: w - 1 }); x += w } y += hh; doc.setFont('helvetica', 'normal') }
  head(); doc.setFontSize(6.3)
  rows.forEach((r, i) => { if (y + 5.2 > H - 30) { doc.addPage(); y = onPage(); head(); doc.setFontSize(6.3) } let x = 10; if (tebal?.(i)) doc.setFont('helvetica', 'bold')
    cols.forEach((c, j) => { const w = c.w * k; doc.rect(x, y, w, 5.2); const t = doc.splitTextToSize(String(r[j] ?? ''), w - 1.6)[0] ?? ''; const al = c.a ?? 'l'; doc.text(t, al === 'r' ? x + w - 0.8 : al === 'c' ? x + w / 2 : x + 0.8, y + 3.6, { align: al === 'r' ? 'right' : al === 'c' ? 'center' : 'left' }); x += w }); doc.setFont('helvetica', 'normal'); y += 5.2 })
  return y
}
function ttd(doc: jsPDF, y: number, bulan: string) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(); if (y + 38 > H - 8) { doc.addPage(); y = 20 }
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(`Jakarta, ${bulan}`, W - 20, y + 8, { align: 'right' })
  const bl = (x: number, j: string, n: string) => { doc.setFont('helvetica', 'bold'); doc.text(j, x, y + 15, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.text(n, x, y + 34, { align: 'center' }); doc.setLineWidth(0.2); doc.line(x - 28, y + 35, x + 28, y + 35) }
  bl(W * 0.3, 'Asisten (Manager) Pengendalian Operasi dan Quality Control', 'Catur Aji Nugroho'); bl(W * 0.7, 'Manager Operasi', 'Rully Indra')
}
const bulanIni = () => { const d = new Date(Date.now() + 7 * 36e5); return `${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
export type RingkasMitra = { mitra: string; n: number; vol: number; skor: number | null; kat: string }
/** Formulir evaluasi kinerja mitra transport (per shipment + ringkasan per mitra). */
export function pdfTransport(rows: DRow[], q: number, y: number) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const sub = `Periode Evaluasi : ${TW(q, y)}`
  const sel = rows.filter(r => inTW(r.etaPodReal ?? r.etaPolReal, q, y) && r.status.toUpperCase() !== 'CANCEL').sort((a, b) => a.mitra.localeCompare(b.mitra) || (a.etaPolReal ?? 0) - (b.etaPolReal ?? 0))
  const hit = sel.map(r => { const sp = r.etaPolReal != null && r.etaPolRen != null ? Math.round((r.etaPolReal - r.etaPolRen) / 864e5) : null, sd = r.etaPodReal != null && r.etaPodRen != null ? Math.round((r.etaPodReal - r.etaPodRen) / 864e5) : null
    const p = (r.bl != null && r.ds != null && r.bl > 0) ? (r.bl - r.ds) / r.bl * 100 : r.short; const a = skorEta(sp), b = skorEta(sd), c = skorShort(p); const tot = avg([a, b, c]); return { r, sp, sd, p, a, b, c, tot } })
  kop(doc, 'FORMULIR EVALUASI KINERJA MITRA TRANSPORT', sub)
  const cols: Col[] = [{ h: 'No', w: 5, a: 'c' }, { h: 'Mitra', w: 30 }, { h: 'POL', w: 18 }, { h: 'POD', w: 20 }, { h: 'Vol. Rencana', w: 12, a: 'r' }, { h: 'ETA POL Rencana', w: 12, a: 'c' }, { h: 'ETA POL Real.', w: 12, a: 'c' }, { h: 'Selisih (hari)', w: 9, a: 'r' }, { h: 'Score', w: 8, a: 'r' }, { h: 'ETA POD Rencana', w: 12, a: 'c' }, { h: 'ETA POD Real.', w: 12, a: 'c' }, { h: 'Selisih (hari)', w: 9, a: 'r' }, { h: 'Score', w: 8, a: 'r' }, { h: 'BL (load)', w: 12, a: 'r' }, { h: 'DS (disch)', w: 12, a: 'r' }, { h: 'Shortage (%)', w: 10, a: 'r' }, { h: 'Score', w: 8, a: 'r' }, { h: 'Total Score', w: 10, a: 'r' }]
  const body = hit.map((h, i) => [String(i + 1), h.r.mitra, h.r.pol, h.r.pod, f0(h.r.volRen), fd(h.r.etaPolRen), fd(h.r.etaPolReal), h.sp == null ? '' : String(h.sp), h.a == null ? '' : String(h.a), fd(h.r.etaPodRen), fd(h.r.etaPodReal), h.sd == null ? '' : String(h.sd), h.b == null ? '' : String(h.b), f2(h.r.bl), f2(h.r.ds), h.p == null ? '' : f2(h.p), String(h.c), f1(h.tot)])
  let yy = tabel(doc, cols, body.length ? body : [['', 'Tidak ada shipment pada periode ini', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']], 34, () => { kop(doc, 'FORMULIR EVALUASI KINERJA MITRA TRANSPORT', sub); return 34 })
  const by = new Map<string, typeof hit>(); hit.forEach(h => by.set(h.r.mitra, [...(by.get(h.r.mitra) ?? []), h]))
  const rk: RingkasMitra[] = [...by].map(([mitra, a]) => { const s = avg(a.map(x => x.tot)); return { mitra, n: a.length, vol: a.reduce((t, x) => t + (x.r.ds ?? x.r.volReal ?? 0), 0), skor: s, kat: s == null ? '-' : kategori(s) } }).sort((a, b) => (b.skor ?? 0) - (a.skor ?? 0))
  if (rk.length) { doc.addPage(); kop(doc, 'FORMULIR EVALUASI KINERJA MITRA TRANSPORT', sub + ' · Ringkasan per Mitra'); yy = tabel(doc, [{ h: 'No', w: 6, a: 'c' }, { h: 'Mitra', w: 60 }, { h: 'Jumlah Shipment', w: 18, a: 'r' }, { h: 'Volume DS (MT)', w: 22, a: 'r' }, { h: 'Score Rata-rata', w: 18, a: 'r' }, { h: 'Kategori', w: 18, a: 'c' }], rk.map((m, i) => [String(i + 1), m.mitra, String(m.n), f0(m.vol), f1(m.skor), m.kat]), 34, () => 34) }
  doc.setFontSize(6.5); doc.text('Score ETA (selisih hari): <2=100, <4=95, <6=90, <14=75, <30=50, selain itu 25. Shortage % = (BL-DS)/BL: <2%=100, <5%=90, <10%=75, selain itu 50. Total Score = rata-rata ketiga score. Kategori: >=95 Excellent, >=88 Good, >=78 Fair, selain itu Poor.', 10, yy + 5, { maxWidth: 270 })
  ttd(doc, yy + 8, bulanIni()); return { doc, n: hit.length }
}
/** Formulir evaluasi kinerja mitra pemasok (batubara): per Mitra + Skema + PLTU. */
export function pdfPemasok(ships: QShip[], q: number, y: number) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const sub = `Periode Evaluasi : ${TW(q, y)}`
  const sel = ships.filter(s => s.mitra && inTW(s.selesaiBongkar ?? s.taPltu, q, y) && (s.ds ?? 0) > 0)
  const g = new Map<string, QShip[]>(); sel.forEach(s => { const k = [s.mitra, s.skema || '-', s.plant].join('|'); g.set(k, [...(g.get(k) ?? []), s]) })
  const rows = [...g].map(([k, a]) => { const [mitra, skema, plant] = k.split('|'); const sk = avg(a.map(s => skorMutu(s.turun))); return { mitra, skema, plant, n: a.length, vol: a.reduce((t, s) => t + (s.ds ?? 0), 0), cv: avg(a.map(s => s.gcvU)), tm: avg(a.map(s => s.tmU)), ts: avg(a.map(s => s.tsU)), ash: avg(a.map(s => s.ashU)), hgi: avg(a.map(s => s.hgiU)), drop: avg(a.map(s => s.turun)), sk } }).sort((a, b) => a.mitra.localeCompare(b.mitra) || a.plant.localeCompare(b.plant))
  kop(doc, 'FORMULIR EVALUASI KINERJA MITRA PEMASOK', sub)
  const cols: Col[] = [{ h: 'No', w: 5, a: 'c' }, { h: 'Mitra Batubara', w: 36 }, { h: 'Skema', w: 10, a: 'c' }, { h: 'PLTU', w: 32 }, { h: 'Shipment', w: 10, a: 'r' }, { h: 'Total Volume Realisasi (MT)', w: 18, a: 'r' }, { h: 'GCV Bongkar (kcal/kg)', w: 14, a: 'r' }, { h: 'TM (%)', w: 9, a: 'r' }, { h: 'TS (%)', w: 9, a: 'r' }, { h: 'Ash (%)', w: 9, a: 'r' }, { h: 'HGI', w: 9, a: 'r' }, { h: 'Susut GCV rata2 (kcal)', w: 14, a: 'r' }, { h: 'Score', w: 9, a: 'r' }, { h: 'Kategori', w: 14, a: 'c' }]
  const body = rows.map((r, i) => [String(i + 1), r.mitra, r.skema, r.plant, String(r.n), f0(r.vol), f0(r.cv), f2(r.tm), f2(r.ts), f2(r.ash), f0(r.hgi), f0(r.drop), f1(r.sk), r.sk == null ? '-' : kategori(r.sk)])
  const yy = tabel(doc, cols, body.length ? body : [['', 'Tidak ada shipment pada periode ini', '', '', '', '', '', '', '', '', '', '', '', '']], 34, () => { kop(doc, 'FORMULIR EVALUASI KINERJA MITRA PEMASOK', sub); return 34 })
  doc.setFontSize(6.5); doc.text('Kualitas = rata-rata hasil bongkar (CoA unload) per Mitra + Skema + PLTU. Score per shipment dari susut GCV muat→bongkar (kcal/kg): <=50=100, <=100=95, <=150=90, <=250=75, selain itu 50; Score = rata-rata. Kategori: >=95 Excellent, >=88 Good, >=78 Fair, selain itu Poor.', 10, yy + 5, { maxWidth: 270 })
  ttd(doc, yy + 8, bulanIni()); return { doc, n: rows.length }
}
