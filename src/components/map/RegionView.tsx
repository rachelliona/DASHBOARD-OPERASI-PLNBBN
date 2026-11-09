import { useMemo, useState } from 'react'
import { Box } from 'lucide-react'
import { polysIn } from './geo'
import { REGIONS, STAGES } from '../../domain/status'
import { REGION_COLOR } from '../../config/regions'
import { fmtNum, fmtPct } from '../../domain/format'
import { pct } from '../../domain/kpi'
type Props = { rows: any[]; color: (r: any) => string; sel: string; onSel: (p: string) => void; onFocus: (r: string) => void }
function Mini({ pts, color, sel, hov, setHov, onSel }: { pts: any[]; color: (r: any) => string; sel: string; hov: string; setHov: (s: string) => void; onSel: (p: string) => void }) {
  const g = useMemo(() => {
    if (!pts.length) return null
    const lo = pts.map(r => r.l.lon), la = pts.map(r => r.l.lat); let x0 = Math.min(...lo), x1 = Math.max(...lo), y0 = Math.min(...la), y1 = Math.max(...la)
    const sx = Math.max(3, x1 - x0), sy = Math.max(2, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const k = Math.max(sx / 1.8, sy) * 1.35 // lebar 1.8 : tinggi 1
    const w = k * 1.8, h = k; x0 = cx - w / 2; x1 = cx + w / 2; y0 = cy - h / 2; y1 = cy + h / 2
    return { x0, y0, w, h, polys: polysIn(x0, x1, y0, y1) }
  }, [pts])
  if (!g) return <div className="h-[150px] grid place-items-center text-[11px] text-slate-500">Belum ada koordinat PLTU</div>
  const X = (lon: number) => ((lon - g.x0) / g.w) * 360, Y = (lat: number) => (1 - (lat - g.y0) / g.h) * 200
  const maxV = Math.max(1, ...pts.map(r => r.v ?? 0))
  return <svg viewBox="0 0 360 200" className="w-full rounded-lg bg-[var(--s0)]" role="img" aria-label="Peta mini wilayah">
    <defs><pattern id="gd" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="rgba(120,190,255,.08)" /></pattern></defs><rect width="360" height="200" fill="url(#gd)" />
    {g.polys.map((p, i) => <path key={i} d={'M' + p.map(([a, b]) => X(a).toFixed(1) + ',' + Y(b).toFixed(1)).join('L') + 'Z'} fill="#1b5753" stroke="rgba(167,243,232,.6)" strokeWidth=".8" />)}
    {pts.map(r => { const rad = 4 + 11 * Math.sqrt((r.v ?? 0) / maxV), on = sel === r.pltu || hov === r.pltu; return <g key={r.pltu} onMouseEnter={() => setHov(r.pltu)} onMouseLeave={() => setHov('')} onClick={() => onSel(r.pltu)} style={{ cursor: 'pointer' }}>
      <circle cx={X(r.l.lon)} cy={Y(r.l.lat)} r={rad + (on ? 4 : 0)} fill={color(r)} fillOpacity={on ? .85 : .5} stroke={on ? '#fff' : color(r)} strokeWidth={on ? 2 : 1} />{on && <text x={X(r.l.lon)} y={Y(r.l.lat) - rad - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff" stroke="#0a1620" strokeWidth="3" paintOrder="stroke">{r.pltu}</text>}</g> })}
  </svg>
}
export default function RegionView({ rows, color, sel, onSel, onFocus }: Props) {
  const [hov, setHov] = useState('')
  const regs = REGIONS.map(name => { const rs = rows.filter(r => r.wilayah === name), v = rs.reduce((a, r) => a + (r.v ?? 0), 0), keb = rs.reduce((a, r) => a + (r.keb ?? r.kebutuhan ?? 0), 0), ds = rs.reduce((a, r) => a + (r.act ?? 0), 0)
    const stage: Record<string, number> = {}; rs.forEach(r => (r.sh ?? []).forEach((s: any) => { stage[s.status] = (stage[s.status] ?? 0) + (s.volume ?? 0) }))
    return { name, rs, v, pp: pct(ds, keb), n: rs.reduce((a, r) => a + (r.sh ? r.sh.length : r.n ?? 0), 0), stage, tot: Object.values(stage).reduce((a, b) => a + b, 0) } }).filter(r => r.rs.length)
  if (!regs.length) return <p className="text-xs text-slate-400">Tidak ada data wilayah untuk filter ini.</p>
  return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{regs.map(R => <section key={R.name} className="rcard rounded-xl border border-white/10 bg-white/[.03] p-3">
    <header className="flex items-center gap-2 mb-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: REGION_COLOR[R.name] }} /><h3 className="font-semibold text-sm">{R.name}</h3><span className="ml-auto text-[11px] text-slate-400">{R.rs.length} PLTU · {R.n} shipment</span>
      <button className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] flex items-center gap-1 hover:border-[#e6b457] hover:text-[#e6b457]" onClick={() => onFocus(R.name)} title="Fokus di Peta 3D"><Box size={12} />3D</button></header>
    <Mini pts={R.rs.filter(r => r.l)} color={color} sel={sel} hov={hov} setHov={setHov} onSel={onSel} />
    <div className="grid grid-cols-3 gap-2 my-2 text-center"><div><div className="text-[10px] text-slate-400">Volume</div><b className="text-sm">{fmtNum(R.v)}</b><span className="text-[10px] text-slate-400"> MT</span></div><div><div className="text-[10px] text-slate-400">Pemenuhan</div><b className="text-sm">{fmtPct(R.pp)}</b></div><div><div className="text-[10px] text-slate-400">Shipment</div><b className="text-sm">{R.n}</b></div></div>
    {R.tot > 0 && <><div className="flex h-2 rounded-full overflow-hidden" role="img" aria-label="Komposisi tahapan">{STAGES.map(s => R.stage[s.key] ? <div key={s.key} title={`${s.label}: ${fmtNum(R.stage[s.key])} MT`} style={{ width: (R.stage[s.key] / R.tot) * 100 + '%', background: s.color }} /> : null)}</div>
      <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400 mt-1">{STAGES.filter(s => R.stage[s.key]).map(s => <span key={s.key}><span style={{ color: s.color }}>■</span> {s.label}</span>)}</div></>}
    <ul className="mt-2 text-xs">{[...R.rs].sort((a, b) => (b.v ?? 0) - (a.v ?? 0)).slice(0, 4).map(r => <li key={r.pltu}><button onMouseEnter={() => setHov(r.pltu)} onMouseLeave={() => setHov('')} onClick={() => onSel(r.pltu)} className={'w-full flex items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-white/10 ' + (sel === r.pltu || hov === r.pltu ? 'bg-white/10' : '')}><span style={{ color: color(r) }}>●</span><span className="truncate">{r.pltu}</span><span className="ml-auto text-slate-400">{fmtNum(r.v)} MT</span></button></li>)}</ul>
  </section>)}</div>
}
