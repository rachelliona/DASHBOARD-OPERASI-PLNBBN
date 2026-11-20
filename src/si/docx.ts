import { SI, ALASAN } from './types'
import { fmtNomor, rentangId, tglId } from './logic'
import { namaFile } from './pdf'
const BASE = import.meta.env.BASE_URL
const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
/** Pilih file template sesuai skema / kelistrikan / BIB / revisi — memakai Word asli buatan Racel. */
export function pilihTemplate(s: SI): string {
  const rev = s.revisiKe > 0 ? 'rev-' : ''
  if (s.skema === 'CIF') return `${rev}cif`
  if (s.skema === 'Freight') return s.revisiKe > 0 && !s.kelistrikan ? 'rev-freight-freight' : `${rev}freight-kel`
  return s.bib && s.kelistrikan ? `${rev}fob-kel-bib` : s.kelistrikan ? `${rev}fob-kel` : `${rev}fob-non`
}
const els = (n: Element | Document, tag: string) => Array.from(n.getElementsByTagNameNS(WNS, tag))
const txt = (n: Element) => els(n, 't').map(t => t.textContent ?? '').join('')
const kids = (n: Element, tag: string) => Array.from(n.childNodes).filter(c => (c as Element).localName === tag && (c as Element).namespaceURI === WNS) as Element[]
/** Isi satu paragraf dengan teks baru; format (rPr) run pertama dipertahankan. */
function setP(p: Element, text: string) {
  const runs = els(p, 'r'); const doc = p.ownerDocument
  if (!runs.length) { const r = doc.createElementNS(WNS, 'w:r'); p.appendChild(r); runs.push(r) }
  const first = runs.find(r => els(r, 't').length) ?? runs[0]
  runs.forEach(r => { if (r !== first) r.parentNode?.removeChild(r) })
  Array.from(first.childNodes).forEach(c => { if ((c as Element).localName !== 'rPr') first.removeChild(c) })
  const parts = text.split('\n')
  parts.forEach((ln, i) => { if (i) first.appendChild(doc.createElementNS(WNS, 'w:br')); const t = doc.createElementNS(WNS, 'w:t'); t.setAttribute('xml:space', 'preserve'); t.textContent = ln; first.appendChild(t) })
}
const cells = (tr: Element) => kids(tr, 'tc'); const paras = (tc: Element) => kids(tc, 'p'); const rowsOf = (tb: Element) => kids(tb, 'tr')
function isiTabelAtas(tb: Element, s: SI) {
  const rows = rowsOf(tb); if (rows.length < 2) return; const c0 = cells(rows[0]), c1 = cells(rows[1])
  const nomor = fmtNomor(s.nomor, s.tahun), lay = rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks
  const p01 = paras(c0[1]); if (p01[0]) setP(p01[0], nomor); const p02 = paras(c0[2]); if (p02[0]) setP(p02[0], tglId(s.tanggal))
  const pp = paras(c1[1]); const rev = /^revisi/i.test(txt(pp[0] ?? tb))
  if (rev) { const alasan = [s.alasan ? ALASAN[s.alasan] : '', s.ketRevisi].filter(Boolean).join(' — ') || s.perubahan.map(u => u.label).join(', ')
    if (pp[1]) setP(pp[1], s.sebelumnyaNomor != null ? fmtNomor(s.sebelumnyaNomor, s.tahun) : ''); if (pp[2]) setP(pp[2], `Revisi ke-${s.revisiKe}${alasan ? ` (${alasan})` : ''}`); if (pp[3]) setP(pp[3], `Laycan ${lay} di ${s.muat}`) }
  else { if (pp[1]) setP(pp[1], `Laycan ${lay}`); if (pp[2]) setP(pp[2], `di ${s.muat}`) }
  const pk = paras(c1[2]); const kep = [...new Set([s.mitra, s.transporter].filter(Boolean))]; for (let i = 1; i < pk.length; i++) if (txt(pk[i]).trim() || kep[i - 1]) setP(pk[i], kep[i - 1] ?? '')
}
function isiTabelRinci(tb: Element, s: SI) {
  const fr = s.skema === 'Freight'; const lay = rentangId(s.laycanMulai, s.laycanSelesai) || s.laycanTeks, eta = rentangId(s.etaMulai, s.etaSelesai) || s.etaTeks
  const nilai = (label: string, lama: string): string | null => {
    const l = label.toLowerCase()
    if (l === 'shipper') return [s.mitra, 'PT PLN Batubara Niaga'].filter(Boolean).join(' QQ ')
    if (l === 'kontrak pjbb') return s.kontrak || '-'
    if (l === 'metode pasokan') return s.skema
    if (l === 'consignee') return s.consignee || s.pltu
    if (l === 'notify address') return s.notify
    if (l === 'sumber tambang') return s.tambang
    if (l === 'tropical draft') return s.tropical != null ? `${s.tropical} Ton` : lama
    if (l === 'jumlah barang') return s.volume != null ? (/^\d/.test(lama) ? lama.replace(/^[\d.,]+/, String(s.volume)) : `${s.volume} Ton atau sesuai draught`) : null
    if (l.startsWith('nama kapal')) return `${s.kapal} or subs${s.moda ? ` (${s.moda})` : ''}`
    if (l === 'pelabuhan muat') return s.muat
    if (l === 'laycan') return lay
    if (l.startsWith('eta')) return eta
    if (l === 'pelabuhan bongkar' || l === 'pltu bongkar') return s.bongkar || s.pltu
    return null
  }
  void fr
  rowsOf(tb).forEach(tr => { const c = cells(tr); if (c.length < 3) return; const label = txt(c[0]).trim(); const lama = txt(c[2]).trim(); const v = nilai(label, lama); if (v == null) return
    const ps = paras(c[2]); const lines = v.split('\n').map(x => x.trim()).filter(Boolean); if (!ps.length) return
    ps.forEach((p, i) => { if (i === 0) setP(p, lines[0] ?? '-'); else if (i < lines.length) setP(p, lines[i]); else if (txt(p).trim()) c[2].removeChild(p) })
    for (let i = ps.length; i < lines.length; i++) { const np = ps[0].cloneNode(true) as Element; setP(np, lines[i]); c[2].appendChild(np) } })
}
export async function buatDocx(s: SI): Promise<{ blob: Blob; nama: string; template: string }> {
  const JSZip = (await import('jszip')).default; const tpl = pilihTemplate(s)
  const buf = await (await fetch(`${BASE}si/templates/${tpl}.docx`)).arrayBuffer(); const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml')!.async('string'); const doc = new DOMParser().parseFromString(xml, 'application/xml')
  els(doc, 'tbl').forEach(tb => { const first = txt(rowsOf(tb)[0] ?? tb).trim(); if (/^nomor/i.test(first)) isiTabelAtas(tb, s); else if (/^shipper/i.test(first)) isiTabelRinci(tb, s) })
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  return { blob, nama: namaFile(s).replace(/\.pdf$/, '.docx'), template: tpl }
}
const simpan = (blob: Blob, nama: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
export async function unduhDocx(s: SI) { const { blob, nama } = await buatDocx(s); simpan(blob, nama) }
