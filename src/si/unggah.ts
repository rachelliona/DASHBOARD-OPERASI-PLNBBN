import { SI, kosong } from './types'
import { newId } from './store'

const BLN: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 }
const p2 = (n: number) => String(n).padStart(2, '0')
const tglIso = (d: number, bln: string, th: number) => { const m = BLN[bln.toLowerCase()]; return m ? `${th}-${p2(m)}-${p2(d)}` : '' }
/** "24-26 November 2026" | "30 Nov - 02 Desember 2026" | "05 Desember 2026" -> {a,b} ISO */
export function rentang(t: string): { a: string; b: string } {
  const s = t.replace(/\s+/g, ' ').trim()
  let m = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/); if (m) return { a: tglIso(+m[1], m[3], +m[4]), b: tglIso(+m[2], m[3], +m[4]) }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/); if (m) { const y2 = +m[5]; const y1 = (BLN[m[2].toLowerCase()] ?? 0) > (BLN[m[4].toLowerCase()] ?? 0) ? y2 - 1 : y2; return { a: tglIso(+m[1], m[2], y1), b: tglIso(+m[3], m[4], y2) } }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/); if (m) { const d = tglIso(+m[1], m[2], +m[3]); return { a: d, b: d } }
  return { a: '', b: '' }
}
const LABEL: [string, RegExp][] = [['shipper', /^Shipper\s*:/i], ['kontrak', /^Kontrak PJBB\s*:/i], ['skema', /^Metode Pasokan\s*:/i], ['charterer', /^Charterer\s*:/i], ['consignee', /^Consignee\s*:/i], ['notify', /^Notify Address\s*:/i], ['komoditi', /^Komoditi\s*:/i], ['tambang', /^Sumber Tambang\s*:/i], ['jumlah', /^Jumlah Barang\s*:/i], ['kapal', /^Nama Kapal(?:\/Tongkang)?\s*:/i], ['muat', /^Pelabuhan Muat\s*:/i], ['laycan', /^Laycan\s*:/i], ['eta', /^ETA Pelabuhan Bongkar\s*:/i], ['bongkar', /^Pelabuhan Bongkar\s*:/i]]

/** Baris teks halaman 1 dari pdf.js: kelompokkan per y, urut x. Header kiri/kanan dipisah di atas "Mohon agar". */
export async function bacaBaris(buf: ArrayBuffer): Promise<{ kiri: string[]; kanan: string[]; isi: string[] }> {
  const pdfjs = await import('pdfjs-dist')
  if (!pdfjs.GlobalWorkerOptions.workerPort) { const W = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default; pdfjs.GlobalWorkerOptions.workerPort = new W() }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; const page = await doc.getPage(1); const tc = await page.getTextContent()
  const items = (tc.items as any[]).filter(i => i.str && i.str.trim()).map(i => ({ s: i.str as string, w: (i.width ?? 0) as number, x: i.transform[4] as number, y: Math.round(i.transform[5] as number) }))
  const W = page.getViewport({ scale: 1 }).width
  const grup = (arr: typeof items) => { const g: { y: number; it: typeof items }[] = []; for (const i of [...arr].sort((a, b) => b.y - a.y || a.x - b.x)) { const r = g.find(z => Math.abs(z.y - i.y) <= 3); if (r) r.it.push(i); else g.push({ y: i.y, it: [i] }) } return g.map(z => { let t = '', ex = -1e9; for (const k of z.it.sort((a, b) => a.x - b.x)) { if (t && k.x - ex > 1.6 && !/^\s/.test(k.s) && !/\s$/.test(t)) t += ' '; t += k.s; ex = k.x + k.w } return { y: z.y, t: t.replace(/\s+/g, ' ').trim() } }) }
  const semua = grup(items); const yM = semua.find(l => /^Mohon agar/i.test(l.t))?.y ?? 0
  const atas = items.filter(i => i.y > yM), bawah = items.filter(i => i.y <= yM)
  const kiri = grup(atas.filter(i => i.x < W * 0.58)).map(l => l.t), kanan = grup(atas.filter(i => i.x >= W * 0.58)).map(l => l.t)
  return { kiri, kanan, isi: grup(bawah).map(l => l.t) }
}

export type Hasil = { si: SI; peringatan: string[] }
export function urai(b: { kiri: string[]; kanan: string[]; isi: string[] }, namaFile: string): Hasil {
  const w: string[] = []; const s = kosong()
  const hd = [...b.kiri, ...b.kanan].join('\n')
  const mn = hd.match(/(\d{3,4})\s*\.\s*SI\s*\/\s*EPI\.03\.01\s*\/\s*DIR\s*\/\s*(\d{4})/i) ?? namaFile.match(/(\d{4})()/)
  if (!mn) w.push('Nomor SI tidak terbaca'); else { s.nomor = +mn[1]; if (mn[2]) s.tahun = +mn[2] }
  const hdT = [...b.kanan.filter(l => /^\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*$/.test(l)).slice(0, 1), ...b.kiri.filter(l => /Nomor/i.test(l))].join('\n'); const md = hdT.match(/(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i); if (md) s.tanggal = tglIso(+md[1], md[2], +md[3]); else w.push('Tanggal SI tidak terbaca')
  // revisi: "Revisi Shipping Instruction" + nomor lama + "Revisi ke-N (alasan)"
  if (/Revisi\s+Shipping\s+Instruction/i.test(hd)) { const semua = [...hd.matchAll(/(\d{3,4})\s*\.\s*SI\s*\/\s*EPI\.03\.01\s*\/\s*DIR\s*\/\s*(\d{4})/gi)].map(m => +m[1]); const lama = semua.find(n => n !== s.nomor); const rk = hd.match(/Revisi\s+ke\s*-?\s*(\d+)/i); s.revisiKe = rk ? +rk[1] : 1; if (lama) s.sebelumnyaNomor = lama; else w.push('Nomor SI yang direvisi tidak terbaca'); const al = /armada|kapal/i.test(hd.match(/Revisi\s+ke[^\n]*/i)?.[0] ?? '') ? 'armada' : ''; if (al) s.alasan = al as any }
  // Kepada (kolom kanan): "1. X", "2. Y"
  const kep: string[] = []; let on = false
  for (const l of b.kanan) { if (/^Kepada/i.test(l)) { on = true; continue } if (!on) continue; const m = l.match(/^(\d+)\.\s*(.+)$/); if (m) kep.push(m[2]); else if (kep.length) kep[kep.length - 1] += ' ' + l }
  if (kep[1]) s.transporter = kep[1].trim()
  // tabel
  const f: Record<string, string> = {}; let cur = ''
  for (const l of b.isi) { if (/^Demikian/i.test(l)) break; const lb = LABEL.find(([, r]) => r.test(l)); if (lb) { cur = lb[0]; f[cur] = l.replace(/^[^:]*:\s*/, '').trim() } else if (cur) f[cur] += (cur === 'consignee' || cur === 'notify' ? '\n' : ' ') + l.trim() }
  s.mitra = (f.shipper || '').replace(/\s*QQ\s*PT\.?\s*PLN Batubara Niaga\s*$/i, '').trim(); if (!s.mitra) w.push('Shipper tidak terbaca')
  s.kontrak = f.kontrak || ''; const sk = (f.skema || '').toUpperCase(); s.skema = (['FOB', 'CIF', 'CNF'].includes(sk) ? sk : 'FOB') as any
  s.consignee = f.consignee || ''; s.notify = f.notify || ''; s.tambang = f.tambang || ''
  s.volume = f.jumlah ? +(f.jumlah.match(/[\d.]+/)?.[0] ?? '').replace(/\./g, '') || null : null
  const kp = (f.kapal || '').replace(/\s+/g, ' '); const mm = kp.match(/\(([^)]*)\)\s*$/); s.moda = mm ? mm[1].trim() : ''; s.kapal = kp.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+or subs\.?$/i, '').trim(); if (!s.kapal) w.push('Nama kapal tidak terbaca')
  s.muat = f.muat || ''; const lc = rentang(f.laycan || ''); s.laycanMulai = lc.a; s.laycanSelesai = lc.b; s.laycanTeks = f.laycan || ''; if (!lc.a) w.push('Laycan tidak terbaca')
  const et = rentang(f.eta || ''); s.etaMulai = et.a; s.etaSelesai = et.b; s.etaTeks = f.eta || ''
  s.bongkar = f.bongkar || ''; s.pltu = (f.bongkar || '').replace(/^PLTU\s+/i, '').split(/\.\s|,/)[0].trim()
  s.tahap = 'terbit'; s.sumber = 'sistem'; s.alasan = ''; s.pemohon = 'Racel'
  return { si: s, peringatan: w }
}
export const siBaru = (h: Hasil, oleh: string): SI => ({ ...h.si, id: newId(), dibuat: new Date().toISOString(), dibuatOleh: oleh + ' (unggah)', diubah: new Date().toISOString() })
