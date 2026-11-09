import { useMemo, useRef, useState } from 'react'
import { Ship, STEPS, regionOf } from '../domain/monthly'
import { REGION_COLOR } from '../config/regions'
/** Gantt shipment: satu baris per shipment, dikelompokkan per PLTU. Tiap potongan = satu tahap (antar-milestone); garis putus-putus = tahap yang sedang berjalan sampai hari ini. */
export const PHASE_COLOR = ['#64748b', '#f59e0b', '#a3a3a3', '#38bdf8', '#94a3b8', '#f97316', '#6366f1', '#c084fc', '#22c55e']
const DAY = 864e5, ROW = 24, HEAD = 34, LBL = 196
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const dm = (t: number) => { const d = new Date(t); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1) }
export type GanttProps = { ships: Ship[]; today: number; cmp?: 1 | 6 | 8 | 9; onSelect?: (s: Ship) => void; selId?: string | null; flags?: Map<string, 'tinggi' | 'sedang' | 'rendah'>; group?: boolean; maxH?: number }
export default function Gantt({ ships, today: ref, cmp = 6, onSelect, selId, flags, group = true, maxH = 620 }: GanttProps) {
  const [ppd, setPpd] = useState(15); const [tip, setTip] = useState<{ x: number; y: number; s: Ship } | null>(null); const wrap = useRef<HTMLDivElement>(null)
  const items = useMemo(() => ships.filter(s => s.ms.some(x => x != null) || s.eta != null), [ships])
  const hidden = ships.length - items.length
  const [t0, t1] = useMemo(() => { let a = Infinity, b = -Infinity; for (const s of items) { for (const x of [...s.ms, s.eta]) if (x != null) { a = Math.min(a, x); b = Math.max(b, x) } } if (!isFinite(a)) return [ref - 15 * DAY, ref + 15 * DAY]; b = Math.max(b, ref) + 2 * DAY; a = Math.floor(a / DAY) * DAY - DAY; return [a, Math.ceil(b / DAY) * DAY] }, [items, ref])
  const days = Math.max(7, Math.round((t1 - t0) / DAY)); const W = days * ppd; const X = (t: number) => (t - t0) / DAY * ppd
  const rows = useMemo(() => { const g = new Map<string, Ship[]>(); for (const s of items) { const k = group ? s.plant : 'x'; (g.get(k) ?? g.set(k, []).get(k)!).push(s) }
    const out: ({ h: string; n: number } | Ship)[] = []; const keys = [...g.keys()].sort((a, b) => (regionOf(a) ?? 'z').localeCompare(regionOf(b) ?? 'z') || a.localeCompare(b)); for (const k of keys) { if (group) out.push({ h: k, n: g.get(k)!.length }); out.push(...g.get(k)!.sort((a, b) => (a.ms.find(x => x != null) ?? 0) - (b.ms.find(x => x != null) ?? 0))) } return out }, [items, group])
  const H = HEAD + rows.length * ROW + 6
  const ticks: { t: number; major: boolean }[] = []; for (let t = t0; t <= t1; t += DAY) { const d = new Date(t); const dow = d.getUTCDay(); if (ppd >= 22 || dow === 1 || d.getUTCDate() === 1) ticks.push({ t, major: d.getUTCDate() === 1 || dow === 1 }) }
  const weekends: number[] = []; for (let t = t0; t < t1; t += DAY) { const dow = new Date(t).getUTCDay(); if (dow === 6) weekends.push(t) }
  return <div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2 text-[11px] no-print">
      <div className="flex flex-wrap gap-x-3 gap-y-1">{STEPS.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5 text-slate-300"><i style={{ width: 14, height: 8, borderRadius: 3, background: PHASE_COLOR[i], display: 'inline-block' }} />{n}</span>)}
        <span className="inline-flex items-center gap-1.5 text-slate-300"><svg width="12" height="12"><path d="M6 1l5 5-5 5-5-5z" fill="#fbbf24" /></svg>ETA</span><span className="inline-flex items-center gap-1.5 text-slate-300"><i style={{ width: 2, height: 12, background: '#fb7185', display: 'inline-block' }} />Hari ini</span></div>
      <label className="ml-auto flex items-center gap-2 text-slate-400">Zoom<input type="range" min={6} max={44} value={ppd} onChange={e => setPpd(+e.target.value)} aria-label="Zoom Gantt" className="w-28" style={{ minHeight: 0, padding: 0 }} /></label></div>
    <div ref={wrap} className="gantt-scroll" style={{ maxHeight: maxH }}>
      <div style={{ width: LBL + W + 16, position: 'relative' }}>
        <svg width={LBL + W + 16} height={H} role="img" aria-label="Gantt chart shipment" className="gantt-svg" onMouseLeave={() => setTip(null)}>
          <defs><pattern id="gh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="currentColor" opacity=".5" /></pattern></defs>
          <g transform={`translate(${LBL},0)`}>
            {weekends.map(t => <rect key={t} x={X(t)} y={HEAD} width={ppd * 2} height={H - HEAD} className="g-wknd" />)}
            {ticks.map(k => <g key={k.t}><line x1={X(k.t)} x2={X(k.t)} y1={HEAD - 6} y2={H} className={k.major ? 'g-grid-m' : 'g-grid'} /><text x={X(k.t) + 3} y={HEAD - 12} className="g-tick">{dm(k.t)}</text></g>)}
          </g>
          {rows.map((r, i) => { const y = HEAD + i * ROW
            if ('h' in r) return <g key={'h' + r.h}><rect x={0} y={y} width={LBL + W + 16} height={ROW} className="g-grp" /><circle cx={11} cy={y + ROW / 2} r={4} fill={REGION_COLOR[regionOf(r.h) ?? ''] ?? '#94a3b8'} /><text x={22} y={y + ROW / 2 + 4} className="g-grp-t">{r.h}<tspan className="g-sub"> · {r.n} shipment</tspan></text></g>
            const s = r; const fl = flags?.get(s.id); const nm = s.tbbg.split(';')[0].trim() || s.si || s.id; const act = s.ms[9] == null && s.stage !== 'unloading'
            const last = s.ms.reduce<number>((a, v, k) => v != null ? k : a, -1)
            return <g key={s.id + i} className="g-row" onClick={() => onSelect?.(s)} onMouseMove={e => { const b = wrap.current!.getBoundingClientRect(); setTip({ x: e.clientX - b.left + wrap.current!.scrollLeft, y: e.clientY - b.top + wrap.current!.scrollTop, s }) }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
              <rect x={0} y={y} width={LBL + W + 16} height={ROW} className={'g-hit' + (selId === s.id ? ' on' : '')} />
              {fl && <circle cx={10} cy={y + ROW / 2} r={3.5} fill={fl === 'tinggi' ? '#fb7185' : fl === 'sedang' ? '#fbbf24' : '#38bdf8'} />}
              <text x={20} y={y + ROW / 2 + 4} className="g-lbl">{nm.length > 27 ? nm.slice(0, 26) + '…' : nm}</text>
              <g transform={`translate(${LBL},0)`}>
                {STEPS.map((_, k) => { const a = s.ms[k], b = s.ms[k + 1]; if (a == null || b == null || b < a) return null; return <rect key={k} x={X(a)} y={y + 6} width={Math.max(2, X(b) - X(a))} height={ROW - 12} rx={3} fill={PHASE_COLOR[k]}><title>{STEPS[k]}: {Math.round((b - a) / DAY * 10) / 10} hari</title></rect> })}
                {act && last >= 0 && last < 9 && ref > (s.ms[last] as number) && <g><rect x={X(s.ms[last] as number)} y={y + 6} width={Math.max(2, X(ref) - X(s.ms[last] as number))} height={ROW - 12} rx={3} fill="none" stroke={PHASE_COLOR[last]} strokeWidth={1.3} strokeDasharray="4 3" /><rect x={X(s.ms[last] as number)} y={y + 6} width={Math.max(2, X(ref) - X(s.ms[last] as number))} height={ROW - 12} rx={3} fill="url(#gh)" style={{ color: PHASE_COLOR[last] }} /></g>}
                {s.ms.map((v, k) => v != null && s.ms[k + 1] == null && (k === 0 || s.ms[k - 1] == null) ? <circle key={'m' + k} cx={X(v)} cy={y + ROW / 2} r={3} fill={PHASE_COLOR[Math.min(k, 8)]} /> : null)}
                {s.eta != null && <path d={`M${X(s.eta)} ${y + 3}l6 ${ROW / 2 - 3}-6 ${ROW / 2 - 3}-6-${ROW / 2 - 3}z`} fill="#fbbf24" stroke="rgba(0,0,0,.45)" strokeWidth={.8} />}
                {s.eta != null && (() => { const end = s.ms[cmp] ?? (act && ref > s.eta ? ref : null); return end != null && end > s.eta + DAY ? <line x1={X(s.eta)} x2={X(end)} y1={y + ROW - 3} y2={y + ROW - 3} stroke="#fb7185" strokeWidth={2} strokeLinecap="round" /> : null })()}
              </g></g> })}
          <line x1={LBL + X(ref)} x2={LBL + X(ref)} y1={HEAD - 4} y2={H} stroke="#fb7185" strokeWidth={1.6} /><text x={LBL + X(ref) + 4} y={HEAD + 4} className="g-today">Hari ini</text>
        </svg>
        {tip && <div className="gantt-tip" style={{ left: Math.min(tip.x + 14, LBL + W - 220), top: tip.y + 14 }}><b>{tip.s.plant}</b><div>{tip.s.tbbg.split(';')[0] || tip.s.id}{tip.s.si ? ' · SI ' + tip.s.si : ''}</div>{tip.s.eta != null && <div>ETA: {iso(tip.s.eta)}</div>}{tip.s.ms[1] != null && <div>TA POL: {iso(tip.s.ms[1]!)}</div>}{tip.s.ms[6] != null && <div>TA PLTU: {iso(tip.s.ms[6]!)}</div>}<div className="g-sub">Status: {tip.s.status || '—'}</div></div>}
      </div></div>
    {hidden > 0 && <p className="text-[11px] text-slate-500 mt-1">{hidden} shipment tidak ditampilkan karena belum punya tanggal milestone maupun ETA.</p>}
  </div>
}
