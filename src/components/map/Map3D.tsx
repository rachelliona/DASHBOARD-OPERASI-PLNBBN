import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCw, Ship, Home } from 'lucide-react'
import { land, seaOrigin, hash } from './geo'
import { REGIONS, STATUSES } from '../../domain/status'
import { REGION_COLOR } from '../../config/regions'
import { fmtNum, fmtPct } from '../../domain/format'
type Cam = { lon: number; lat: number; zoom: number; yaw: number; pitch: number }
const HD: Cam = { lon: 118, lat: -2.5, zoom: 1.02, yaw: 0, pitch: 0.95 }, HM: Cam = { lon: 118, lat: -2.5, zoom: 1.9, yaw: -Math.PI / 2, pitch: 1.0 }
const HOME = () => (typeof window !== 'undefined' && window.innerWidth < 640 ? HM : HD)
const STAGE_COLOR = Object.fromEntries(STATUSES.map(s => [s.key, s.color]))
const shade = (hex: string, f: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})` }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
type Props = { rows: any[]; color: (r: any) => string; sel: string; onSel: (p: string) => void; showShips: boolean; reg: string }
/** Peta berdimensi (kanvas 2D dengan proyeksi miring): PLTU = balok setinggi volume, kapal bergerak ilustratif menuju PLTU. */
export default function Map3D({ rows, color, sel, onSel, showShips: ships0, reg }: Props) {
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null)
  const cam = useRef<Cam>({ ...HOME() }), tgt = useRef<Cam>({ ...HOME() }), dirty = useRef(true), hit = useRef<{ r: any; x: number; y: number; w: number; top: number }[]>([])
  const [anim, setAnim] = useState(true), [auto, setAuto] = useState(false), [ships, setShips] = useState(ships0), [hover, setHover] = useState<{ r: any; x: number; y: number } | null>(null)
  const P = useRef({ rows, color, sel, anim, auto, ships, reg, hover: '' }); P.current = { rows, color, sel, anim, auto, ships, reg, hover: hover?.r.pltu ?? '' }
  const located = useMemo(() => rows.filter(r => r.l), [rows])
  const maxV = Math.max(1, ...located.map(r => r.v ?? 0))
  const fly = (name: string) => {
    const pts = name ? located.filter(r => r.wilayah === name) : located
    if (!pts.length) { tgt.current = { ...tgt.current, ...HOME() }; dirty.current = true; return }
    const lo = pts.map(r => r.l.lon), la = pts.map(r => r.l.lat), sx = Math.max(2.5, Math.max(...lo) - Math.min(...lo)), sy = Math.max(2.5, Math.max(...la) - Math.min(...la))
    tgt.current = { ...tgt.current, lon: (Math.max(...lo) + Math.min(...lo)) / 2, lat: (Math.max(...la) + Math.min(...la)) / 2, zoom: clamp(Math.min(52 / (sx * 2.1), 24 / (sy * 2.6)), 1, 7) }; dirty.current = true
  }
  useEffect(() => { fly(reg) }, [reg]) // eslint-disable-line
  useEffect(() => { dirty.current = true }, [rows, sel, hover])
  useEffect(() => {
    const c = cv.current!, box = wrap.current!, ctx = c.getContext?.('2d'); if (!ctx || typeof ResizeObserver === 'undefined') return; let raf = 0, W = 0, H = 0, last = performance.now()
    const size = () => { const d = Math.min(2, window.devicePixelRatio || 1); W = box.clientWidth; H = box.clientHeight; c.width = W * d; c.height = H * d; c.style.width = W + 'px'; c.style.height = H + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); dirty.current = true }
    const ro = new ResizeObserver(size); ro.observe(box); size()
    const proj = (cm: Cam, S: number, lon: number, lat: number, z = 0) => { const dx = lon - cm.lon, dy = lat - cm.lat, cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw), xr = dx * cy - dy * sy, yr = dx * sy + dy * cy; return [W / 2 + xr * S, H * 0.54 - yr * S * Math.sin(cm.pitch) - z * S * Math.cos(cm.pitch), yr] as const }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame); const dt = Math.min(50, now - last); last = now; const p = P.current, cm = cam.current, tg = tgt.current
      if (p.auto) { cm.yaw += dt * 0.00035; tg.yaw = cm.yaw; dirty.current = true }
      for (const k of ['lon', 'lat', 'zoom', 'yaw', 'pitch'] as const) { const d = tg[k] - cm[k]; if (Math.abs(d) > 1e-4) { cm[k] += d * 0.14; dirty.current = true } }
      if (!p.anim && !dirty.current) return; dirty.current = false
      const S = (W / 54) * cm.zoom, T = now, cp = Math.cos(cm.pitch)
      ctx.clearRect(0, 0, W, H)
      // grid koordinat + sapuan pemindai
      ctx.lineWidth = 1
      for (let lo = 90; lo <= 145; lo += 5) { const a = proj(cm, S, lo, -14), b = proj(cm, S, lo, 10); ctx.strokeStyle = 'rgba(120,190,255,.07)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
      for (let la = -14; la <= 10; la += 4) { const a = proj(cm, S, 90, la), b = proj(cm, S, 145, la); ctx.strokeStyle = 'rgba(120,190,255,.07)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
      if (p.anim) { const lo = 90 + ((T * 0.004) % 55), a = proj(cm, S, lo, -14), b = proj(cm, S, lo, 10); const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(.5, 'rgba(34,211,238,.22)'); g.addColorStop(1, 'rgba(34,211,238,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1 }
      // daratan: lempeng bertebal
      const pr = land.map(poly => poly.map(([lo, la]) => proj(cm, S, lo, la))), thick = Math.max(5, S * 0.16 * cp)
      for (let d = thick; d >= 1; d -= 1.5) { ctx.fillStyle = shade('#0f3a3f', 0.45 + 0.55 * (1 - d / thick)); for (const q of pr) { ctx.beginPath(); q.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1] + d) : ctx.moveTo(pt[0], pt[1] + d)); ctx.closePath(); ctx.fill() } }
      for (const q of pr) { ctx.beginPath(); q.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fillStyle = '#1b5753'; ctx.fill(); ctx.strokeStyle = 'rgba(94,234,212,.28)'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = 'rgba(167,243,232,.75)'; ctx.lineWidth = 1; ctx.stroke() }
      // objek 3D diurutkan dari jauh ke dekat
      type D = { z: number; f: () => void }; const items: D[] = []; hit.current = []
      const loc = p.rows.filter(r => r.l)
      for (const r of loc) {
        const base = p.color(r), dim = p.reg && r.wilayah !== p.reg, h = r.v ? 0.25 + 3.4 * Math.sqrt(r.v / maxV) : 0.05, w = 0.17, on = p.sel === r.pltu, hv = p.hover === r.pltu
        const [bx, by, depth] = proj(cm, S, r.l.lon, r.l.lat)
        items.push({ z: depth, f: () => {
          ctx.globalAlpha = dim ? 0.25 : 1
          const cn = [[-w, -w], [w, -w], [w, w], [-w, w]].map(([a, b]) => [proj(cm, S, r.l.lon + a, r.l.lat + b, 0), proj(cm, S, r.l.lon + a, r.l.lat + b, h)])
          const nrm = [[0, -1], [1, 0], [0, 1], [-1, 0]]
          if (on || hv) { ctx.shadowColor = base; ctx.shadowBlur = 22 }
          nrm.forEach(([nx, ny], i) => { const j = (i + 1) % 4, cyw = Math.cos(cm.yaw), syw = Math.sin(cm.yaw), nyr = nx * syw + ny * cyw, nxr = nx * cyw - ny * syw; if (nyr > 0.02) return
            ctx.beginPath(); ctx.moveTo(cn[i][0][0], cn[i][0][1]); ctx.lineTo(cn[j][0][0], cn[j][0][1]); ctx.lineTo(cn[j][1][0], cn[j][1][1]); ctx.lineTo(cn[i][1][0], cn[i][1][1]); ctx.closePath(); ctx.fillStyle = shade(base, 0.5 + 0.3 * (nxr + 1) / 2 + (r.v ? 0 : -0.1)); ctx.fill() })
          ctx.shadowBlur = 0
          ctx.beginPath(); cn.forEach((c, i) => i ? ctx.lineTo(c[1][0], c[1][1]) : ctx.moveTo(c[1][0], c[1][1])); ctx.closePath(); ctx.fillStyle = shade(base, 1.12); ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.35)'; ctx.lineWidth = on ? 2 : 1; ctx.stroke()
          if (on) { const R = 0.45 + 0.12 * Math.sin(T / 300); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k <= 36; k++) { const a = (k / 36) * 6.283, q = proj(cm, S, r.l.lon + R * Math.cos(a), r.l.lat + R * Math.sin(a), 0); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]) } ctx.stroke() }
          ctx.globalAlpha = 1
          const top = proj(cm, S, r.l.lon, r.l.lat, h); hit.current.push({ r, x: top[0], y: top[1], w: Math.max(8, w * S * 1.3), top: top[1] }); hit.current[hit.current.length - 1].w = Math.max(9, w * S * 1.5)
        } })
        // kapal ilustratif
        if (p.ships && r.sh?.length) r.sh.forEach((s: any, i: number) => {
          const st = s.status; if (!['loading', 'sailing', 'tiba', 'bongkar'].includes(st)) return
          const key = (s.id ?? r.pltu) + ':' + i, o = seaOrigin(key, r.l.lon, r.l.lat), hh = hash(key); let lo: number, la: number, z = 0.04, t = 0
          if (st === 'sailing') { t = ((T * 0.000045 + hh) % 1); lo = o[0] + (r.l.lon - o[0]) * t; la = o[1] + (r.l.lat - o[1]) * t; z = 0.05 + 0.5 * Math.sin(Math.PI * t) }
          else if (st === 'loading') { lo = o[0]; la = o[1] }
          else if (st === 'tiba') { const a = T * 0.0007 + hh * 6.28; lo = r.l.lon + 0.55 * Math.cos(a); la = r.l.lat + 0.55 * Math.sin(a) }
          else { lo = r.l.lon + (o[0] - r.l.lon) * 0.1; la = r.l.lat + (o[1] - r.l.lat) * 0.1 }
          const q = proj(cm, S, lo, la, z), col = STAGE_COLOR[st] ?? '#fff', sz = 4 + Math.min(4, Math.sqrt((s.volume ?? 0) / 8000))
          items.push({ z: q[2] - 0.001, f: () => {
            if (st === 'sailing') { const a = proj(cm, S, o[0], o[1], 0), b = proj(cm, S, r.l.lon, r.l.lat, 0); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(249,115,22,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]) }
            const nx = proj(cm, S, lo + (r.l.lon - lo) * 0.02, la + (r.l.lat - la) * 0.02, z), ang = Math.atan2(nx[1] - q[1], nx[0] - q[0]) || 0
            ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(st === 'sailing' ? ang : 0)
            if (st === 'loading' || st === 'bongkar') { const pu = 1 + 0.35 * Math.sin(T / 260 + hh * 9); ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, sz * 1.6 * pu, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1 }
            ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, -sz * 0.55); ctx.lineTo(-sz * 0.5, 0); ctx.lineTo(-sz * 0.8, sz * 0.55); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.restore() } })
        })
      }
      items.sort((a, b) => b.z - a.z).forEach(i => i.f())
      // label
      ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      const top = [...hit.current].sort((a, b) => (b.r.v ?? 0) - (a.r.v ?? 0)).slice(0, cm.zoom > 2.5 ? 40 : 7)
      const show = new Set([...top.map(h => h.r.pltu), p.sel, p.hover].filter(Boolean))
      const placed: number[][] = [], order = [...hit.current].filter(h => show.has(h.r.pltu)).sort((a, b) => (b.r.pltu === p.sel || b.r.pltu === p.hover ? 1 : 0) - (a.r.pltu === p.sel || a.r.pltu === p.hover ? 1 : 0) || (b.r.v ?? 0) - (a.r.v ?? 0))
      for (const h of order) { const tw = ctx.measureText(h.r.pltu).width + 12, y = h.y - 10, box = [h.x - tw / 2, y - 12, h.x + tw / 2, y + 5], pri = h.r.pltu === p.sel || h.r.pltu === p.hover
        if (!pri && placed.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) continue; placed.push(box)
        ctx.fillStyle = 'rgba(8,12,20,.78)'; ctx.beginPath(); ctx.roundRect(box[0], box[1], tw, 17, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(h.r.pltu, h.x, y + 0.5) }
    }
    raf = requestAnimationFrame(frame)
    // interaksi
    const ptrs = new Map<number, { x: number; y: number }>(); let moved = 0, pinch = 0, down = { x: 0, y: 0 }
    const rect = () => c.getBoundingClientRect()
    const pick = (mx: number, my: number) => { let best: any = null, bd = 1e9; for (const h of hit.current) { const d = Math.hypot(mx - h.x, Math.min(Math.abs(my - h.y), 1e9) * 0.6); if (Math.abs(mx - h.x) < h.w && my > h.y - 14 && my < h.y + h.w * 2.4 + 40 && d < bd) { bd = d; best = h } } return best }
    const pd = (e: PointerEvent) => { c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; down = { x: e.clientX, y: e.clientY }; pinch = 0 }
    const pm = (e: PointerEvent) => {
      const prev = ptrs.get(e.pointerId); const r0 = rect()
      if (!prev) { const h = pick(e.clientX - r0.left, e.clientY - r0.top); setHover(old => (h ? { r: h.r, x: old && old.r.pltu === h.r.pltu ? old.x : h.x, y: old && old.r.pltu === h.r.pltu ? old.y : h.y } : null)); c.style.cursor = h ? 'pointer' : 'grab'; return }
      const cm = cam.current, tg = tgt.current; const dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved += Math.abs(dx) + Math.abs(dy)
      const S = (W / 54) * cm.zoom
      const pan = (ddx: number, ddy: number) => { const xr = ddx / S, yr = -ddy / (S * Math.sin(cm.pitch)), cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw); tg.lon = cm.lon = cm.lon - (xr * cy + yr * sy); tg.lat = cm.lat = cm.lat - (-xr * sy + yr * cy) }
      if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) { tg.zoom = cm.zoom = clamp(cm.zoom * (d / pinch), 0.8, 10) } pinch = d; pan(dx / 2, dy / 2) }
      else if (e.shiftKey || e.buttons === 2 || e.buttons === 4) pan(dx, dy)
      else { tg.yaw = cm.yaw = cm.yaw + dx * 0.006; tg.pitch = cm.pitch = clamp(cm.pitch + dy * 0.004, 0.25, 1.35) }
      dirty.current = true
    }
    const pu = (e: PointerEvent) => { ptrs.delete(e.pointerId); pinch = 0; if (moved < 6 && ptrs.size === 0) { const r0 = rect(), h = pick(e.clientX - r0.left, e.clientY - r0.top); if (h) onSelRef.current(h.r.pltu) } }
    const wh = (e: WheelEvent) => { e.preventDefault(); const t = tgt.current; t.zoom = clamp(t.zoom * Math.exp(-e.deltaY * 0.0014), 0.8, 10); dirty.current = true }
    const dbl = () => { tgt.current = { ...HOME() }; dirty.current = true }
    const lv = () => setHover(null)
    c.addEventListener('pointerdown', pd); c.addEventListener('pointermove', pm); c.addEventListener('pointerup', pu); c.addEventListener('pointercancel', pu); c.addEventListener('wheel', wh, { passive: false }); c.addEventListener('dblclick', dbl); c.addEventListener('pointerleave', lv); c.addEventListener('contextmenu', e => e.preventDefault())
    return () => { cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener('pointerdown', pd); c.removeEventListener('pointermove', pm); c.removeEventListener('pointerup', pu); c.removeEventListener('pointercancel', pu); c.removeEventListener('wheel', wh); c.removeEventListener('dblclick', dbl); c.removeEventListener('pointerleave', lv) }
  }, [maxV])
  const onSelRef = useRef(onSel); onSelRef.current = onSel
  const chip = 'rounded-full border px-2.5 py-0.5 text-[11px] backdrop-blur whitespace-nowrap shrink-0 '
  return <div ref={wrap} className="map3d relative h-[62vh] min-h-[380px] md:h-[560px] rounded-xl overflow-hidden border border-white/10 select-none" style={{ touchAction: 'none' }}>
    <canvas ref={cv} aria-label="Peta 3D PLTU dan kapal" role="img" className="absolute inset-0" style={{ cursor: 'grab' }} />
    <div className="absolute left-2 top-2 right-2 pointer-events-none"><div className="flex gap-1.5 pointer-events-auto overflow-x-auto no-scrollbar pb-1">
      <button className={chip + (!reg ? 'bg-[#e6b457] text-black border-[#e6b457]' : 'bg-black/40 border-white/20')} onClick={() => fly('')}>Seluruh Indonesia</button>
      {REGIONS.map(r => <button key={r} className={chip + (reg === r ? 'bg-white/20 border-white' : 'bg-black/40 border-white/20')} onClick={() => fly(r)}><span style={{ color: REGION_COLOR[r] }}>●</span> {r}</button>)}</div></div>
    <div className="absolute right-2 bottom-2 flex gap-1.5">
      <button aria-label="Putar otomatis" title="Putar otomatis" className={'ctl ' + (auto ? 'on' : '')} onClick={() => setAuto(a => !a)}><RotateCw size={15} /></button>
      <button aria-label={anim ? 'Jeda animasi' : 'Putar animasi'} title="Animasi" className={'ctl ' + (anim ? 'on' : '')} onClick={() => setAnim(a => !a)}>{anim ? <Pause size={15} /> : <Play size={15} />}</button>
      <button aria-label="Tampilkan kapal" title="Kapal ilustratif" className={'ctl ' + (ships ? 'on' : '')} onClick={() => setShips(s => !s)}><Ship size={15} /></button>
      <button aria-label="Kembali ke tampilan awal" title="Atur ulang" className="ctl" onClick={() => { tgt.current = { ...HOME() }; dirty.current = true }}><Home size={15} /></button></div>
    <p className="absolute left-2 bottom-2 text-[10px] map-hint pointer-events-none">Seret = putar/miring · Shift atau klik kanan = geser · roda/cubit = zoom · klik ganda = atur ulang</p>
    {hover && <div className="absolute pointer-events-none rounded-lg border border-white/20 bg-[var(--s0)]/95 px-2.5 py-1.5 text-[11px] shadow-xl" style={{ left: clamp(hover.x + 12, 4, (wrap.current?.clientWidth ?? 600) - 230), top: clamp(hover.y + 10, 40, (wrap.current?.clientHeight ?? 400) - 90) }}><b className="text-xs">{hover.r.pltu}</b><div style={{ color: REGION_COLOR[hover.r.wilayah] }}>{hover.r.wilayah ?? 'Tanpa wilayah'}</div><div>{fmtNum(hover.r.v)} MT · {hover.r.sh ? hover.r.sh.length : hover.r.n} shipment · {fmtPct(hover.r.pp)}</div></div>}
  </div>
}
