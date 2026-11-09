import { toSvg, type Assets, type Slide } from './scene'
const url = (f: string) => `${import.meta.env.BASE_URL}laporan/${f}`
const toData = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error('Gagal memuat ' + u); const b = await r.blob(); return await new Promise<string>((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = no; f.readAsDataURL(b) }) }
let cache: Assets | null = null
const FONTS: [number, string][] = [[400, 'normal'], [700, 'normal'], [400, 'italic'], [700, 'italic']]
export async function loadAssets(): Promise<Assets> {
  if (cache) return cache
  const fc = (await Promise.all(FONTS.map(async ([w, st]) => `@font-face{font-family:'Poppins';font-weight:${w};font-style:${st};src:url(${await toData(url(`fonts/poppins-latin-${w}-${st}.woff2`))}) format('woff2')}`))).join('')
  try { await Promise.all(FONTS.map(([w, st]) => document.fonts.load(`${st === 'italic' ? 'italic ' : ''}${w} 14px Poppins`))) } catch { /* abaikan */ }
  return cache = { bg: await toData(url('bg.jpg')), kapal: await toData(url('kapal.png')), batubara: await toData(url('batubara.png')), fontCss: fc }
}
const file = (bulan: string, ext: string) => `Laporan_Harian_${bulan}_2026.${ext}`
const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }
const raster = (svg: string) => new Promise<string>((ok, no) => { const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })); const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 2560; c.height = 1440; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, 2560, 1440); x.drawImage(im, 0, 0, 2560, 1440); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.93)) }; im.onerror = () => no(new Error('Gagal merender slide')); im.src = u })
export async function downloadPdf(slides: Slide[], bulan: string) {
  const [{ jsPDF }, a] = await Promise.all([import('jspdf'), loadAssets()]); const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720], hotfixes: ['px_scaling'] })
  for (let i = 0; i < slides.length; i++) { if (i) pdf.addPage([1280, 720], 'landscape'); pdf.addImage(await raster(toSvg(slides[i], a, true)), 'JPEG', 0, 0, 1280, 720) }
  save(pdf.output('blob'), file(bulan, 'pdf'))
}
const hex = (c?: string) => (c ?? '#000000').replace('#', '').toUpperCase()
export async function downloadPpt(slides: Slide[], bulan: string) {
  const [{ default: Pptx }, a] = await Promise.all([import('pptxgenjs'), loadAssets()]); const p = new Pptx(); p.defineLayout({ name: 'WIDE', width: 1280 / 96, height: 720 / 96 }); p.layout = 'WIDE'; p.title = `Laporan Harian ${bulan} 2026`
  const I = (v: number) => v / 96
  for (const sl of slides) {
    const s = p.addSlide()
    for (const e of sl.els) {
      if (e.t === 'img') s.addImage({ data: a[e.src], x: I(e.x), y: I(e.y), w: I(e.w), h: I(e.h) })
      else if (e.t === 'rect') s.addShape(e.r ? p.ShapeType.roundRect : p.ShapeType.rect, { x: I(e.x), y: I(e.y), w: I(e.w), h: I(e.h), ...(e.fill && e.fill !== 'none' ? { fill: { color: hex(e.fill) } } : { fill: { type: 'none' } as any }), line: e.stroke ? { color: hex(e.stroke), width: (e.sw ?? 1) * 0.75, dashType: e.dash ? 'dash' : 'solid' } : { type: 'none' } as any, ...(e.r ? { rectRadius: e.r / 96 } : {}) } as any)
      else if (e.t === 'line') s.addShape(p.ShapeType.line, { x: I(Math.min(e.x1, e.x2)), y: I(Math.min(e.y1, e.y2)), w: I(Math.abs(e.x2 - e.x1)), h: I(Math.abs(e.y2 - e.y1)), line: { color: hex(e.color), width: (e.w ?? 1) * 0.75, ...(e.arrows ? { beginArrowType: 'triangle', endArrowType: 'triangle' } : {}) } } as any)
      else s.addText(e.s, { x: I(e.x), y: I(e.y), w: I(e.w), h: I(e.h), fontFace: 'Poppins', fontSize: e.size * 0.75, bold: !!e.bold, italic: !!e.italic, color: hex(e.color), align: e.align === 'c' ? 'center' : e.align === 'r' ? 'right' : 'left', valign: e.va === 'm' ? 'middle' : e.va === 'b' ? 'bottom' : 'top', margin: 0, wrap: !(!e.s.includes('\n') && e.h <= e.size * 1.9), fit: 'none' } as any)
    }
  }
  save(await p.write({ outputType: 'blob' }) as Blob, file(bulan, 'pptx'))
}
