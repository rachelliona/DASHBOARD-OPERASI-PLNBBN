import { useMemo, useState } from 'react'
import { Factory, Mountain } from 'lucide-react'
import { REGIONS, STATUSES, stageLabel } from '../../domain/status'
import { REGION_COLOR } from '../../config/regions'
import { fmtNum } from '../../domain/format'
import { hash } from './geo'
/** Kolom jalur: tambang (darat) -> loading -> laut -> antri -> bongkar -> PLTU (darat). */
const COLS = [
  { keys: ['terjadwal', 'carryOver'], label: 'Tambang', sub: 'Jadwal muat / Carry Over', w: 13, zone: 'darat' },
  { keys: ['loading'], label: 'Loading', sub: 'Jetty muat', w: 15, zone: 'darat' },
  { keys: ['sailing'], label: 'Sailing', sub: 'Di laut', w: 26, zone: 'laut' },
  { keys: ['tiba'], label: 'Tiba/Antri', sub: 'Reede PLTU', w: 14, zone: 'laut' },
  { keys: ['bongkar'], label: 'Proses Bongkar', sub: 'Dermaga PLTU', w: 14, zone: 'darat' },
  { keys: ['unloading'], label: 'Unloading', sub: 'Masuk stockpile PLTU', w: 18, zone: 'darat' },
]
const STAGE_COLOR = Object.fromEntries(STATUSES.map(s => [s.key, s.color]))
const colOf = (st: string) => COLS.findIndex(c => c.keys.includes(st))
type Props = { ships: any[]; reg: string; sel: string; onSel: (p: string) => void }
export default function FlowLanes({ ships, reg, sel, onSel }: Props) {
  const [hov, setHov] = useState<any>(null)
  const lanes = useMemo(() => REGIONS.filter(r => !reg || r === reg).map(r => {
    const list = ships.filter(s => (s.wilayah ?? '') === r && colOf(s.status) >= 0)
    const cells = COLS.map((c, ci) => { const arr = list.filter(s => colOf(s.status) === ci).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)); const cap = Math.max(2, Math.floor((c.w / 100) * 900 / 34)); return { arr, cap, rowsN: Math.max(1, Math.ceil(arr.length / cap)) } })
    return { r, list, cells, h: Math.max(...cells.map(c => c.rowsN)) * 38 + 36, mt: list.reduce((a, s) => a + (s.volume ?? 0), 0) }
  }), [ships, reg])
  const totals = COLS.map((c, ci) => { const l = ships.filter(s => colOf(s.status) === ci && (!reg || s.wilayah === reg)); return { n: l.length, mt: l.reduce((a, s) => a + (s.volume ?? 0), 0) } })
  let acc = 0; const starts = COLS.map(c => { const s = acc; acc += c.w; return s })
  return <div className="flow rounded-xl border border-white/10 bg-[#0a0d13] overflow-hidden">
    <div className="flow-info text-xs px-3 py-2 border-b border-white/10 min-h-[44px] flex items-center gap-2" aria-live="polite">
      {hov ? <><span style={{ color: STAGE_COLOR[hov.status] }}>●</span><b>{hov.kapal ?? hov.id}</b><span className="text-slate-400">→</span><b>{hov.pltu}</b><span className="text-slate-300">· {stageLabel(hov.status)} · {fmtNum(hov.volume)} MT</span><span className="text-slate-400 truncate">· {hov.mitraTambang ?? '—'} / {hov.mitraTransport ?? '—'}{hov.eta ? ' · ETA ' + hov.eta : ''}</span></> : <span className="text-slate-400">Arahkan kursor ke kapal untuk melihat rincian · klik untuk membuka PLTU di panel detail. Ukuran kapal = volume (MT).</span>}</div>
    <div className="overflow-x-auto"><div style={{ minWidth: 1040 }}>
      <div className="flex"><div className="w-[130px] shrink-0" /><div className="relative flex-1 grid" style={{ gridTemplateColumns: COLS.map(c => c.w + 'fr').join(' ') }}>
        {COLS.map((c, i) => <div key={c.label} className={'px-2 py-1.5 text-center border-l border-white/5 ' + (c.zone === 'laut' ? 'bg-sky-500/10' : 'bg-amber-900/10')}><div className="text-[10px] tracking-widest uppercase" style={{ color: c.zone === 'laut' ? '#7dd3fc' : '#d6b38a' }}>{c.zone}</div><div className="text-xs font-semibold">{c.label}</div><div className="text-[10px] text-slate-400">{totals[i].n} shipment · {fmtNum(totals[i].mt)} MT</div></div>)}</div></div>
      {lanes.map(L => <div key={L.r} className="flex border-t border-white/10" style={{ height: L.h }}>
        <div className="w-[130px] shrink-0 sticky left-0 z-10 bg-[#0a0d13] px-2 py-2 border-r border-white/10"><div className="text-xs font-semibold"><span style={{ color: REGION_COLOR[L.r] }}>●</span> {L.r}</div><div className="text-[10px] text-slate-400">{L.list.length} shipment<br />{fmtNum(L.mt)} MT</div><div className="flex gap-1 mt-1 text-slate-500"><Mountain size={12} /><span className="text-[9px]">→</span><Factory size={12} /></div></div>
        <div className="relative flex-1 lane">
          <div className="lane-land" style={{ left: 0, width: starts[2] + '%' }} /><div className="lane-sea" style={{ left: starts[2] + '%', width: COLS[2].w + COLS[3].w + '%' }} /><div className="lane-land" style={{ left: starts[4] + '%', width: 100 - starts[4] + '%' }} />
          <div className="lane-flow" />
          {COLS.map((c, ci) => L.cells[ci].arr.map((s, i) => { const per = L.cells[ci].cap, row = Math.floor(i / per), col = i % per, inRow = Math.min(per, L.cells[ci].arr.length - row * per)
            const x = starts[ci] + ((col + 0.5) / inRow) * c.w, size = 15 + Math.min(14, Math.sqrt((s.volume ?? 0) / 600)), hh = hash((s.id ?? '') + i), on = sel === s.pltu
            return <button key={ci + '-' + i + s.id} onMouseEnter={() => setHov(s)} onFocus={() => setHov(s)} onMouseLeave={() => setHov(null)} onClick={() => onSel(s.pltu)} aria-label={`${s.kapal ?? s.id} menuju ${s.pltu}, ${stageLabel(s.status)}`}
              className={'ship ' + (ci === 2 ? 'ship-sail ' : ci === 3 || ci === 1 ? 'ship-bob ' : '') + (on ? 'ship-on' : '')} style={{ left: x + '%', top: 12 + row * 38, color: STAGE_COLOR[s.status], animationDelay: -hh * 4 + 's' }}>
              <svg width={size} height={size * 0.7} viewBox="0 0 24 16" aria-hidden><path d="M2 8h20l-3 7H5z" fill="currentColor" /><path d="M8 8V3h6v5M11 3V0" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>
              {ci >= 4 && <span className="ship-lbl">{String(s.pltu).slice(0, 9)}</span>}</button> }))}
        </div></div>)}
    </div></div>
    <p className="text-[10px] text-slate-500 px-3 py-2 border-t border-white/10">Alur batubara: tambang (darat) → kapal di laut → PLTU (darat). Posisi dalam kolom mengikuti status shipment, bukan koordinat GPS kapal.</p>
  </div>
}
