import { useEffect, useMemo, useRef, useState } from 'react'
import { Ship, STEPS, regionOf } from '../domain/monthly'
import { REGION_COLOR } from '../config/regions'
import { STATUSES, stageLabel } from '../domain/status'
import { fmtNum } from '../domain/format'
/** Gantt model tabel: kolom info tetap di kiri (Mitra, Kategori, Nominasi/Vessel, Vol, ETA, Status) + kolom harian di kanan. Dikelompokkan Wilayah → PLTU. Tiap potongan batang = satu tahap; arsir = tahap berjalan sampai hari ini; penanda merah = ETA. */
export const PHASE_COLOR = ['#64748b', '#f59e0b', '#a3a3a3', '#38bdf8', '#94a3b8', '#f97316', '#6366f1', '#c084fc', '#22c55e']
const DAY = 864e5, ROW = 30, HD = 54
const HARI = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'], BLN = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const dm = (t: number) => { const d = new Date(t); return d.getUTCDate() + ' ' + BLN[d.getUTCMonth()].slice(0, 1) + BLN[d.getUTCMonth()].slice(1).toLowerCase() }
export type GanttProps = { ships: Ship[]; today: number; cmp?: 1 | 6 | 8 | 9; onSelect?: (s: Ship) => void; selId?: string | null; flags?: Map<string, 'tinggi' | 'sedang' | 'rendah'>; group?: boolean; maxH?: number }
type R = { k: 'reg'; n: string; plt: number; sh: number; vol: number } | { k: 'plt'; n: string; sh: number; vol: number } | { k: 's'; s: Ship }
export default function Gantt({ ships, today: ref, cmp = 6, onSelect, selId, flags, group = true, maxH = 640 }: GanttProps) {
  const [cw, setCw] = useState(26); const wrap = useRef<HTMLDivElement>(null)
  const items = useMemo(() => ships.filter(s => s.ms.some(x => x != null) || s.eta != null), [ships])
  const hidden = ships.length - items.length
  const [t0, t1] = useMemo(() => { let a = Infinity, b = -Infinity; for (const s of items) for (const x of [...s.ms, s.eta]) if (x != null) { a = Math.min(a, x); b = Math.max(b, x) }
    if (!isFinite(a)) return [ref - 15 * DAY, ref + 15 * DAY]; b = Math.max(b, ref) + 2 * DAY; return [Math.floor(a / DAY) * DAY - DAY, Math.ceil(b / DAY) * DAY] }, [items, ref])
  const days = Math.max(7, Math.round((t1 - t0) / DAY)); const W = days * cw; const X = (t: number) => (t - t0) / DAY * cw; const today0 = Math.floor(ref / DAY) * DAY
  const rows = useMemo(() => { const out: R[] = []; const byReg = new Map<string, Map<string, Ship[]>>()
    for (const s of items) { const r = group ? regionOf(s.plant) ?? 'Lainnya' : 'Semua'; const p = group ? s.plant : 'x'; const m = byReg.get(r) ?? byReg.set(r, new Map()).get(r)!; (m.get(p) ?? m.set(p, []).get(p)!).push(s) }
    for (const r of [...byReg.keys()].sort()) { const m = byReg.get(r)!; const all = [...m.values()].flat(); if (group) out.push({ k: 'reg', n: r, plt: m.size, sh: all.length, vol: all.reduce((a, s) => a + (s.vol || 0), 0) })
      for (const p of [...m.keys()].sort()) { const l = m.get(p)!.sort((a, b) => (a.ms.find(x => x != null) ?? 9e15) - (b.ms.find(x => x != null) ?? 9e15)); if (group) out.push({ k: 'plt', n: p, sh: l.length, vol: l.reduce((a, s) => a + (s.vol || 0), 0) }); l.forEach(s => out.push({ k: 's', s })) } }
    return out }, [items, group])
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => t0 + i * DAY), [t0, days])
  const months = useMemo(() => { const o: { m: string; n: number }[] = []; for (const t of dayList) { const d = new Date(t); const m = BLN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); if (o.length && o[o.length - 1].m === m) o[o.length - 1].n++; else o.push({ m, n: 1 }) } return o }, [dayList])
  const toToday = (smooth = true) => { const w = wrap.current; if (w) w.scrollTo({ left: Math.max(0, X(today0) - w.clientWidth * 0.35), behavior: smooth ? 'smooth' : 'auto' }) }
  useEffect(() => { toToday(false) }, [items.length, t0])
  const grid = { backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent ${cw - 1}px, rgba(var(--ink),.07) ${cw - 1}px, rgba(var(--ink),.07) ${cw}px)` }
  return <div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2 text-[11px] no-print">
      <div className="flex flex-wrap gap-x-3 gap-y-1">{STEPS.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5 text-slate-300"><i style={{ width: 14, height: 8, borderRadius: 3, background: PHASE_COLOR[i], display: 'inline-block' }} />{n}</span>)}
        <span className="inline-flex items-center gap-1.5 text-slate-300"><i style={{ width: 3, height: 12, background: '#e11d48', borderRadius: 2, display: 'inline-block' }} />ETA</span><span className="inline-flex items-center gap-1.5 text-slate-300"><i style={{ width: 14, height: 8, borderRadius: 2, display: 'inline-block', background: 'repeating-linear-gradient(45deg,#fb7185 0 3px,transparent 3px 6px)' }} />Terlewat ETA / berjalan</span></div>
      <button className="pbtn ml-auto" onClick={() => toToday()}>Ke hari ini</button><label className="flex items-center gap-2 text-slate-400">Zoom<input type="range" min={14} max={44} value={cw} onChange={e => setCw(+e.target.value)} aria-label="Zoom Gantt" className="w-28" style={{ minHeight: 0, padding: 0 }} /></label></div>
    <div ref={wrap} className="tg-scroll" style={{ maxHeight: maxH }}>
      <div className="tg" style={{ width: 'max-content', minWidth: '100%' }}>
        <div className="tg-head" style={{ height: HD }}>
          <div className="tg-fix tg-hfix"><span className="c-mitra">Mitra</span><span className="c-kat">Kategori</span><span className="c-ves">Nominasi / Vessel</span><span className="c-vol">Vol</span><span className="c-eta">ETA</span><span className="c-st">Status</span></div>
          <div style={{ width: W }}>
            <div className="flex" style={{ height: 22 }}>{months.map(m => <div key={m.m} className="tg-mon" style={{ width: m.n * cw }}>{m.m}</div>)}</div>
            <div className="flex">{dayList.map(t => { const d = new Date(t), w = d.getUTCDay(); return <div key={t} className={'tg-day' + (w === 0 || w === 6 ? ' we' : '') + (t === today0 ? ' td' : '') + (d.getUTCDate() === 1 ? ' m1' : '')} style={{ width: cw }}><span>{HARI[w]}</span><b>{d.getUTCDate()}</b></div> })}</div>
          </div>
        </div>
        {rows.map((r, i) => {
          if (r.k === 'reg') return <div key={'r' + r.n} className="tg-row tg-reg" style={{ height: ROW }}><div className="tg-fix"><i style={{ background: REGION_COLOR[r.n] ?? '#94a3b8' }} /><b>{r.n}</b><span>{r.plt} PLTU · {r.sh} shipment · {fmtNum(r.vol)} MT</span></div><div style={{ width: W }} /></div>
          if (r.k === 'plt') return <div key={'p' + r.n + i} className="tg-row tg-plt" style={{ height: ROW }}><div className="tg-fix"><b>{r.n}</b><span>{r.sh} shipment · {fmtNum(r.vol)} MT</span></div><div style={{ width: W, ...grid }} /></div>
          const s = r.s; const fl = flags?.get(s.id); const nm = s.tbbg.split(';')[0].trim() || (s.si ? 'SI ' + s.si : 'TBN'); const act = s.ms[9] == null && s.stage !== 'unloading'; const last = s.ms.reduce<number>((a, v, k) => v != null ? k : a, -1)
          const end = s.eta != null ? (s.ms[cmp] ?? (act && ref > s.eta ? ref : null)) : null
          return <div key={s.id + i} className={'tg-row tg-sh' + (selId === s.id ? ' on' : '')} style={{ height: ROW }} onClick={() => onSelect?.(s)} title={`${s.plant} · ${nm}${s.eta != null ? ' · ETA ' + iso(s.eta) : ''}`}>
            <div className="tg-fix">{fl && <em className={'fl ' + fl} />}<span className="c-mitra">{s.mitraReal || s.sumber || '—'}</span><span className="c-kat">{s.konf === 'carry' ? <u className="co">Carry Over</u> : 'Konfirmasi'}</span><span className="c-ves">{nm}</span><span className="c-vol">{s.vol ? fmtNum(s.vol) : s.jumlah ? fmtNum(s.jumlah) : '—'}</span><span className="c-eta">{s.eta != null ? dm(s.eta) : '—'}</span><span className="c-st"><i className="sd" style={{ background: STATUSES.find(x => x.key === s.stage)?.color ?? '#94a3b8' }} />{s.stage ? (s.stage === 'terjadwal' ? 'Terjadwal' : stageLabel(s.stage)) : 'Menunggu'}</span></div>
            <div className="tg-tl" style={{ width: W, ...grid }}>
              {dayList.map(t => { const w = new Date(t).getUTCDay(); return w === 0 || w === 6 ? <b key={t} className="tg-we" style={{ left: X(t), width: cw }} /> : null })}
              <b className="tg-today" style={{ left: X(today0), width: cw }} />
              {STEPS.map((_, k) => { const a = s.ms[k], b = s.ms[k + 1]; if (a == null || b == null || b < a) return null; return <b key={k} className="tg-bar" style={{ left: X(a), width: Math.max(4, X(b) - X(a)), background: PHASE_COLOR[k] }} title={`${STEPS[k]}: ${Math.round((b - a) / DAY * 10) / 10} hari`} /> })}
              {act && last >= 0 && last < 9 && ref > (s.ms[last] as number) && <b className="tg-run" style={{ left: X(s.ms[last] as number), width: Math.max(4, X(ref) - X(s.ms[last] as number)), color: PHASE_COLOR[last], borderColor: PHASE_COLOR[last] }} />}
              {s.ms.map((v, k) => v != null && s.ms[k + 1] == null && (k === 0 || s.ms[k - 1] == null) ? <b key={'m' + k} className="tg-dot" style={{ left: X(v) - 3, background: PHASE_COLOR[Math.min(k, 8)] }} /> : null)}
              {s.eta != null && end != null && end > s.eta + DAY && <b className="tg-late" style={{ left: X(s.eta), width: X(end) - X(s.eta) }} />}
              {s.eta != null && <b className="tg-eta" style={{ left: X(s.eta) + cw / 2 - 1 }} />}
            </div></div>
        })}
      </div></div>
    {hidden > 0 && <p className="text-[11px] text-slate-500 mt-1">{hidden} shipment tidak ditampilkan karena belum punya tanggal milestone maupun ETA.</p>}
  </div>
}
