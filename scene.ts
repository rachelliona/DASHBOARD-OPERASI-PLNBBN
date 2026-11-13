/** Adegan 1280×720 yang sama dipakai untuk pratinjau (SVG), PDF, dan PPT. */
export type El =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: boolean; r?: number }
  | { t: 'text'; x: number; y: number; w: number; h: number; s: string; size: number; color?: string; bold?: boolean; italic?: boolean; align?: 'l' | 'c' | 'r'; va?: 't' | 'm' | 'b' }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; color?: string; w?: number; arrows?: boolean; dash?: boolean }
  | { t: 'img'; x: number; y: number; w: number; h: number; src: 'bg' | 'kapal' | 'batubara' }
export type Slide = { name: string; els: El[] }
export const W = 1280, H = 720
export const FONT = 'Poppins, Arial, Helvetica, sans-serif'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export type Assets = Record<'bg' | 'kapal' | 'batubara', string> & { fontCss?: string }
export function toSvg(sl: Slide, a: Assets, embed = false): string {
  const o: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">`, `<defs>${embed && a.fontCss ? `<style>${a.fontCss}</style>` : ''}<marker id="ah" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto-start-reverse"><path d="M0,0.5 L6,3.5 L0,6.5 z" fill="#111"/></marker></defs>`, '<rect width="1280" height="720" fill="#fff"/>']
  for (const e of sl.els) {
    if (e.t === 'img') o.push(`<image href="${a[e.src]}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="none"/>`)
    else if (e.t === 'rect') o.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.r ?? 0}" fill="${e.fill ?? 'none'}"${e.stroke ? ` stroke="${e.stroke}" stroke-width="${e.sw ?? 1}"` : ''}${e.dash ? ' stroke-dasharray="6 4"' : ''}/>`)
    else if (e.t === 'line') o.push(`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color ?? '#111'}" stroke-width="${e.w ?? 1}"${e.dash ? ' stroke-dasharray="5 4"' : ''}${e.arrows ? ' marker-start="url(#ah)" marker-end="url(#ah)"' : ''}/>`)
    else {
      const ls = e.s.split('\n'); const lh = e.size * 1.18; const tot = ls.length * lh; const a0 = e.align ?? 'l'
      const x = a0 === 'l' ? e.x : a0 === 'c' ? e.x + e.w / 2 : e.x + e.w; const y0 = (e.va ?? 't') === 't' ? e.y : e.va === 'm' ? e.y + (e.h - tot) / 2 : e.y + e.h - tot
      o.push(`<text x="${x}" text-anchor="${a0 === 'l' ? 'start' : a0 === 'c' ? 'middle' : 'end'}" font-size="${e.size}" fill="${e.color ?? '#111'}"${e.bold ? ' font-weight="700"' : ''}${e.italic ? ' font-style="italic"' : ''}>${ls.map((l, i) => `<tspan x="${x}" y="${y0 + lh * i + e.size * 0.9}">${esc(l)}</tspan>`).join('')}</text>`)
    }
  }
  o.push('</svg>'); return o.join('')
}
