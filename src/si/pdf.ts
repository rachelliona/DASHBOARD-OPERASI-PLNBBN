import { SI, ALASAN } from './types'
import { fmtNomor, rentangId, tglId } from './logic'
const BASE = import.meta.env.BASE_URL
export function barisSurat(s: SI): [string, string][] {
  const fr = s.skema === 'Freight'; const r: [string, string][] = []
  r.push(['Shipper', [s.mitra, 'PT PLN Batubara Niaga'].filter(Boolean).join(' QQ ')])
  if (!fr) { r.push(['Kontrak PJBB', s.kontrak || '-']); r.push(['Metode Pasokan', s.skema]) }
  r.push(['Charterer', 'PT PLN Batubara Niaga'], ['Consignee', s.consignee || s.pltu || '-'], ['Notify Address', s.notify || '-'], ['Komoditi', 'Steam Coal'], ['Sumber Tambang', s.tambang || '-'])
  r.push(['Jumlah Barang', s.volume != null ? `${s.volume} Ton atau sesuai draught` : '-'])
  r.push(['Nama Kapal/Tongkang', s.kapal ? `${s.kapal} or subs${s.moda ? ` (${/ft|vessel/i.test(s.moda) ? s.moda : s.moda})` : ''}` : '-'])
  r.push(['Pelabuhan Muat', s.muat || '-'], ['Laycan', rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks || '-'])
  r.push([fr ? 'ETA PLTU' : 'ETA Pelabuhan Bongkar', rentangId(s.etaMulai, s.etaSelesai) || s.etaTeks || '-'], [fr ? 'PLTU Bongkar' : 'Pelabuhan Bongkar', s.bongkar || s.pltu || '-'])
  return r
}
async function img(u: string) { try { const b = await (await fetch(u)).blob(); return await new Promise<string>(ok => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsDataURL(b) }) } catch { return '' } }
export function namaFile(s: SI) { return `${s.revisiKe ? 'Revisi ' : ''}SI ${String(s.nomor ?? 'draft').padStart(4, '0')}-${s.tahun} ${(s.mitra || s.tambang || '').replace(/^PT\.?\s*/i, '').replace(/[^\w ]/g, '').trim()}`.trim() + '.pdf' }
/** Tata letak mengikuti contoh SI asli (PDF dari Word): koordinat dalam px pada 90 dpi, A4 = 744 x 1052 px. */
const PX = 210 / 744
export async function buatPdf(s: SI, draft = false, paraf: 'ada' | 'kosong' = (() => { try { return localStorage.getItem('pln-si-paraf') === 'kosong' ? 'kosong' : 'ada' } catch { return 'ada' } })()): Promise<{ blob: Blob; nama: string }> {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'mm', format: 'a4' }); const m = (px: number) => px * PX
  const kop = await img(BASE + 'si/kop.png'); if (kop) { try { d.addImage(kop, 'PNG', 0, m(35), m(699), m(93.6)) } catch { /* tanpa kop */ } }
  d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(0)
  const T = (t: string, x: number, y: number, o?: any) => d.text(t, m(x), m(y + 5), o)
  const wrap = (t: string, w: number) => d.splitTextToSize(t, m(w)) as string[]
  const nomor = s.nomor == null ? `……….SI/EPI.03.01/DIR/${s.tahun}` : fmtNomor(s.nomor, s.tahun); const rev = s.revisiKe > 0; const lay = rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks
  const perihal = rev ? ['Revisi Shipping Instruction', s.sebelumnyaNomor != null ? fmtNomor(s.sebelumnyaNomor, s.tahun) : '', `Revisi ke-${s.revisiKe}${s.alasan ? ` (${ALASAN[s.alasan]})` : ''}`, `Laycan ${lay}\ndi ${s.muat}`].filter(Boolean) : ['Shipping Instruction', `Laycan ${lay}\ndi ${s.muat}`]
  T('Nomor', 75, 152); T(':', 145, 152); T(nomor, 160, 152); T('Lampiran', 75, 169); T(':', 145, 169); T('-', 160, 169); T('Perihal', 75, 185); T(':', 145, 185)
  let y = 185; perihal.forEach((t, i) => { d.setFont('helvetica', i === 0 ? 'italic' : 'normal'); t.split('\n').flatMap(x => wrap(x, 255)).forEach((ln, j) => { if (j === 0) { T('•', 165, y) } T(ln, 187, y); y += 15.5 }) }); d.setFont('helvetica', 'normal'); const yPer = y
  T(tglId(s.tanggal || ''), 453, 152); T('Kepada :', 453, 185); const kep = [...new Set([s.mitra, s.transporter].filter(Boolean))]; let ky = 200; kep.forEach((k, i) => { wrap(k, 220).forEach((ln, j) => { T(j ? ln : `${i + 1}.  ${ln}`, j ? 470 : 453, ky); ky += 15.5 }) })
  y = Math.max(yPer, ky) + 33; d.text('Mohon agar dapat dilakukan proses pengapalan batubara dengan informasi sebagai berikut:', m(75), m(y + 5), { maxWidth: m(594), align: 'justify' }); y += 16 * 2 + 17
  barisSurat(s).forEach(([k, v]) => { const ln = wrap(v, 369); T(k, 95, y); T(':', 283, y)
    if (ln.length === 1 && (k === 'Komoditi' || /draught|or subs/.test(v))) { // huruf miring seperti contoh: Steam Coal, draught, or subs
      let x = 300; v.split(/(draught|or subs)/).filter(Boolean).forEach(seg => { d.setFont('helvetica', k === 'Komoditi' || seg === 'draught' || seg === 'or subs' ? 'italic' : 'normal'); T(seg.trim(), x + (/^\s/.test(seg) ? 5 : 0), y); const sp = 5; x += d.getTextWidth(seg.trim()) / PX + (/\s$/.test(seg) ? sp : 0); if (/^\s/.test(seg)) x += sp }); d.setFont('helvetica', 'normal')
    } else ln.forEach((t, i) => T(t, 300, y + i * 15.6))
    y += Math.max(1, ln.length) * 15.6 })
  if (rev && s.perubahan.length) { y += 6; d.setFont('helvetica', 'bold'); d.setFontSize(9.5); T('Perubahan dari SI sebelumnya:', 95, y); d.setFont('helvetica', 'normal'); y += 14; s.perubahan.slice(0, 8).forEach(u => { wrap(`- ${u.label}: ${u.dari}  menjadi  ${u.ke}`, 480).forEach(ln => { T(ln, 102, y); y += 13.5 }) }); d.setFontSize(10.5) }
  y += 14; T('Demikian disampaikan atas perhatiannya diucapkan terimakasih.', 75, y)
  const ys = Math.max(y + 49, 642); T('PLT DIREKTUR NIAGA &', 560, ys, { align: 'center' }); T('OPERASI', 560, ys + 21, { align: 'center' })
  const yn = ys + 107; d.setFont('times', 'normal'); d.setFontSize(9.5); T('Tembusan :', 75, yn - 6); T('1.', 80, yn + 8); T('Direktur Utama PT PLN Batubara Niaga', 100, yn + 8)
  d.setFont('helvetica', 'normal'); d.setFontSize(10.5); T('RAHMAT DIAN AMIR', 560, yn, { align: 'center' }); d.setFont('times', 'normal'); d.setFontSize(9.5); T('Paraf : ………………..', 500, yn + 41)
  if (paraf === 'ada') { const pi = await img(BASE + 'si/paraf.png'); if (pi) { try { d.addImage(pi, 'PNG', m(536), m(yn + 20), m(60), m(48)) } catch { /* tanpa paraf */ } } }
  if (draft) { d.setTextColor(210, 60, 60); d.setFontSize(60); d.setFont('helvetica', 'bold'); d.text('DRAFT', 105, 160, { align: 'center', angle: 35 }) }
  return { blob: d.output('blob'), nama: namaFile(s) }
}
export async function unduhPdf(s: SI, draft = false) { const { blob, nama } = await buatPdf(s, draft); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
