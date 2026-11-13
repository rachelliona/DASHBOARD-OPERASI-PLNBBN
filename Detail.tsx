import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'

/** Popup detail yang dipakai di semua halaman: klik kartu/grafik/batang → ringkasan angka + daftar + tautan aksi. */
export type DetailSpec = {
  /** 'modal' = popup tengah (info singkat), 'drawer' = panel dari kanan (detail/grafik). Kosong = otomatis menurut isi. */
  variant?: 'modal' | 'drawer'
  title: string; sub?: string; color?: string; icon?: any
  stats?: { l: string; v: string; c?: string }[]
  note?: string
  table?: { head: string[]; rows: (string | number)[][]; align?: ('l' | 'r')[] }
  actions?: ({ label: string; to: string } | { label: string; onClick: () => void })[]
  body?: ReactNode
  /** komposisi bertumpuk satu batang (mis. tahapan) */
  stack?: { title: string; items: { l: string; v: number; c: string }[]; unit?: string }
  /** daftar batang horizontal (peringkat) */
  bars?: { title: string; items: { l: string; v: number; c?: string; sub?: string }[]; unit?: string; fmt?: (v: number) => string }[]
  /** grafik garis/area kecil */
  trend?: { title: string; labels: string[]; data: (number | null)[]; color?: string; unit?: string; ref?: { v: number; l: string }[] }
}
const nf = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })
function Trend({ t, c }: { t: NonNullable<DetailSpec['trend']>; c: string }) {
  const W = 520, H = 150, P = 28; const vals = t.data.filter((x): x is number => x != null); if (vals.length < 2) return null
  const hi = Math.max(...vals, ...(t.ref ?? []).map(r => r.v)) * 1.1 || 1, lo = Math.min(0, ...vals); const X = (i: number) => P + i * (W - P - 8) / Math.max(1, t.data.length - 1), Y = (v: number) => H - 22 - (v - lo) / (hi - lo) * (H - 34)
  const pts = t.data.map((v, i) => v == null ? null : [X(i), Y(v)] as const).filter(Boolean) as (readonly [number, number])[]; const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ')
  return <div className="dlg-sec"><h4>{t.title}</h4><svg viewBox={`0 0 ${W} ${H}`} className="dlg-trend" role="img" aria-label={t.title}>
    {[0, .5, 1].map(f => <g key={f}><line x1={P} x2={W - 8} y1={Y(lo + (hi - lo) * f)} y2={Y(lo + (hi - lo) * f)} stroke="currentColor" strokeOpacity=".12" /><text x={P - 4} y={Y(lo + (hi - lo) * f) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity=".6">{nf(lo + (hi - lo) * f)}</text></g>)}
    {(t.ref ?? []).map(r => <g key={r.l}><line x1={P} x2={W - 8} y1={Y(r.v)} y2={Y(r.v)} stroke="#fbbf24" strokeDasharray="4 3" strokeOpacity=".8" /><text x={W - 10} y={Y(r.v) - 3} textAnchor="end" fontSize="9" fill="#fbbf24">{r.l}</text></g>)}
    <path d={`${d} L${pts[pts.length - 1][0]} ${H - 22} L${pts[0][0]} ${H - 22} Z`} fill={c} opacity=".14" /><path d={d} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r="2.6" fill={c}><title>{`${t.labels[t.data.findIndex((v, k) => v != null && X(k) === q[0])] ?? ''}: ${nf(t.data.filter(v => v != null)[i] as number)} ${t.unit ?? ''}`}</title></circle>)}
    {[0, Math.floor((t.data.length - 1) / 2), t.data.length - 1].map(i => <text key={i} x={X(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === t.data.length - 1 ? 'end' : 'middle'} fontSize="9" fill="currentColor" opacity=".65">{t.labels[i]}</text>)}</svg></div>
}
const Ctx = createContext<{ open: (s: DetailSpec) => void; close: () => void }>({ open: () => {}, close: () => {} })
export const useDetail = () => useContext(Ctx)

export function DetailProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<DetailSpec | null>(null); const box = useRef<HTMLDivElement>(null); const prev = useRef<HTMLElement | null>(null)
  const open = useCallback((x: DetailSpec) => { prev.current = document.activeElement as HTMLElement; setS(x) }, [])
  const close = useCallback(() => { setS(null); prev.current?.focus?.() }, [])
  useEffect(() => {
    if (!s) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; box.current?.focus()
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [s, close])
  const I = s?.icon; const drawer = !!s && (s.variant ? s.variant === 'drawer' : !!(s.table || s.bars || s.stack || s.trend || s.body))
  return <Ctx.Provider value={{ open, close }}>{children}
    {s && createPortal(<div className={'dlg-back ' + (drawer ? 'drawer' : 'modal')} onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className={'dlg ' + (drawer ? 'dlg-drawer' : 'dlg-modal')} role="dialog" aria-modal="true" aria-label={s.title} tabIndex={-1} ref={box} style={{ ['--c' as any]: s.color ?? '#e6b457' }}>
        <div className="dlg-h">{I && <span className="dlg-ic"><I size={18} /></span>}<div className="min-w-0 flex-1"><h3>{s.title}</h3>{s.sub && <p>{s.sub}</p>}</div><button className="dlg-x" aria-label="Tutup" onClick={close}><X size={18} /></button></div>
        <div className="dlg-b">
          {s.stats && <div className="dlg-stats">{s.stats.map(x => <div key={x.l} className="dlg-stat"><span>{x.l}</span><b style={x.c ? { color: x.c } : undefined}>{x.v}</b></div>)}</div>}
          {s.note && <p className="dlg-note">{s.note}</p>}
          {s.stack && (() => { const tot = s.stack.items.reduce((a, x) => a + x.v, 0) || 1; return <div className="dlg-sec"><h4>{s.stack.title}</h4><div className="dlg-stack">{s.stack.items.filter(x => x.v > 0).map(x => <i key={x.l} style={{ width: `${x.v / tot * 100}%`, background: x.c }} data-tip={`${x.l}: ${nf(x.v)} ${s.stack!.unit ?? ''} (${nf(x.v / tot * 100)}%)`} />)}</div>
            <div className="dlg-leg">{s.stack.items.filter(x => x.v > 0).map(x => <span key={x.l}><i style={{ background: x.c }} />{x.l} <b>{nf(x.v)}</b></span>)}</div></div> })()}
          {s.trend && <Trend t={s.trend} c={s.trend.color ?? s.color ?? '#38bdf8'} />}
          {s.bars?.map(b => { const mx = Math.max(1, ...b.items.map(x => x.v)); return <div key={b.title} className="dlg-sec"><h4>{b.title}</h4><div className="dlg-bars">{b.items.map(x => <div key={x.l} className="dlg-bar" data-tip={`${x.l}: ${(b.fmt ?? nf)(x.v)} ${b.unit ?? ''}`}><span className="truncate">{x.l}{x.sub && <em>{x.sub}</em>}</span><div><i style={{ width: `${x.v / mx * 100}%`, background: x.c ?? s.color ?? '#38bdf8' }} /></div><b className="num">{(b.fmt ?? nf)(x.v)}</b></div>)}</div></div> })}
          {s.body}
          {s.table && <div className="dlg-tw"><table className="dt"><thead><tr>{s.table.head.map((h, i) => <th key={i} className={s.table!.align?.[i] === 'r' ? 'r' : ''}>{h}</th>)}</tr></thead>
            <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={s.table!.align?.[j] === 'r' ? 'r num' : ''}>{c}</td>)}</tr>)}</tbody></table></div>}
        </div>
        {s.actions && s.actions.length > 0 && <div className="dlg-f">{s.actions.map(a => 'to' in a
          ? <Link key={a.label} to={a.to} onClick={close} className="dlg-a">{a.label}<ArrowRight size={14} /></Link>
          : <button key={a.label} className="dlg-a" onClick={() => { a.onClick(); close() }}>{a.label}<ArrowRight size={14} /></button>)}</div>}
      </div></div>, document.body)}
  </Ctx.Provider>
}
