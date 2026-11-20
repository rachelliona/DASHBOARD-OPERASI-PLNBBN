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
export async function buatPdf(s: SI, draft = false, paraf: 'ada' | 'kosong' = (() => { try { return localStorage.getItem('pln-si-paraf') === 'kosong' ? 'kosong' : 'ada' } catch { return 'ada' } })()): Promise<{ blob: Blob; nama: string }> {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'mm', format: 'a4' }); const L = 20, R = 190, W = R - L
  const logo = await img(BASE + 'logo-light.png'); if (logo) { try { d.addImage(logo, 'PNG', L, 12, 41, 13) } catch { /* tanpa logo */ } }
  d.setDrawColor(0, 120, 160); d.setLineWidth(.6); d.line(L, 29, R, 29)
  let y = 38; d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(0)
  const nomor = fmtNomor(s.nomor, s.tahun); const rev = s.revisiKe > 0
  const perihal = rev ? ['Revisi Shipping Instruction', `${s.sebelumnyaNomor != null ? fmtNomor(s.sebelumnyaNomor, s.tahun) + ' ' : ''}Revisi ke-${s.revisiKe}${s.alasan ? ` (${ALASAN[s.alasan]})` : ''}`, `Laycan ${rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks}`, `di ${s.muat}`] : ['Shipping Instruction', `Laycan ${rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks}`, `di ${s.muat}`]
  d.text('Nomor', L, y); d.text(': ' + nomor, L + 24, y); d.text('Lampiran', L, y + 5.5); d.text(': -', L + 24, y + 5.5); d.text('Perihal', L, y + 11); const pw = 82
  let py = y + 11; perihal.forEach((t, i) => { d.setFont('helvetica', i === 0 ? 'bold' : 'normal'); (d.splitTextToSize((i === 0 ? ': ' : '  ') + t, pw) as string[]).forEach(ln => { d.text(ln, L + 24, py); py += 5 }) }); d.setFont('helvetica', 'normal')
  d.text(tglId(s.tanggal || ''), R, y, { align: 'right' }); const kepada = [...new Set([s.mitra, s.transporter].filter(Boolean))]; let ky = y + 11; d.text('Kepada :', 128, ky); kepada.forEach(k => { (d.splitTextToSize(k, 60) as string[]).forEach(ln => { ky += 5; d.text(ln, 128, ky) }) })
  y = Math.max(py, ky) + 8; d.text('Mohon agar dapat dilakukan proses pengapalan batubara dengan informasi sebagai berikut:', L, y); y += 8
  barisSurat(s).forEach(([k, v]) => { const ln = d.splitTextToSize(v, W - 58) as string[]; d.setFont('helvetica', 'normal'); d.text(k, L, y); d.text(':', L + 46, y); ln.forEach((t, i) => d.text(t, L + 52, y + i * 5)); y += Math.max(1, ln.length) * 5 + 1.6 })
  if (rev && s.perubahan.length) { y += 2; d.setFont('helvetica', 'bold'); d.setFontSize(9.5); d.text('Perubahan dari SI sebelumnya:', L, y); d.setFont('helvetica', 'normal'); y += 5; s.perubahan.slice(0, 8).forEach(u => { const t = `• ${u.label}: ${u.dari}  menjadi  ${u.ke}`; (d.splitTextToSize(t, W) as string[]).forEach(ln => { d.text(ln, L + 2, y); y += 4.4 }) }); d.setFontSize(10.5) }
  y += 6; d.text('Demikian disampaikan atas perhatiannya diucapkan terimakasih.', L, y); y += 14
  d.text('PLT DIREKTUR NIAGA & OPERASI', 130, y); d.setFont('helvetica', 'bold'); d.text('RAHMAT DIAN AMIR', 130, y + 24); d.setFont('helvetica', 'normal')
  d.setFontSize(9); d.text('Tembusan :', L, y + 16); d.text('Direktur Utama PT PLN Batubara Niaga', L, y + 21); d.text('Paraf : ………………..', L, y + 30)
  if (paraf === 'ada') { const pi = await img(BASE + 'si/paraf.png'); if (pi) { try { d.addImage(pi, 'PNG', L + 20, y + 24, 14, 11.2) } catch { /* tanpa paraf */ } } }
  if (draft) { d.setTextColor(210, 60, 60); d.setFontSize(60); d.setFont('helvetica', 'bold'); d.text('DRAFT', 105, 160, { align: 'center', angle: 35 }) }
  return { blob: d.output('blob'), nama: namaFile(s) }
}
export async function unduhPdf(s: SI, draft = false) { const { blob, nama } = await buatPdf(s, draft); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
