import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react'
import { SideBySide, SbsItem, shortMT } from './kontrakViz'
import { fmtNum } from '../domain/format'

export type KStat = { l: string; v: string; c?: string }
export type KItem = { key: string; name: string; sub?: string; tag?: ReactNode; color: string; kontrak?: number; real?: number; num?: number; open?: () => KView }
export type KNav = { go: (v: KView) => void; close: () => void }
export type KView = { title: string; sub?: string; color?: string; stats?: KStat[]; note?: ReactNode; body?: (nav: KNav) => ReactNode; items?: KItem[]; itemsTitle?: string; empty?: string; sort?: string; mk?: string }

const PAIR_SORTS: [string, string][] = [['kontrak-desc', 'Kontrak terbesar'], ['kontrak-asc', 'Kontrak terkecil'], ['real-desc', 'Realisasi terbanyak'], ['real-asc', 'Realisasi tersedikit'], ['sisa-desc', 'Paling banyak belum terealisasi'], ['sisa-asc', 'Paling sedikit belum terealisasi'], ['pct-asc', 'Pemenuhan terendah'], ['pct-desc', 'Pemenuhan tertinggi'], ['lebih-desc', 'Paling banyak melebihi kontrak'], ['nama', 'Nama A–Z']]
const NUM_SORTS: [string, string][] = [['num-desc', 'Terbanyak'], ['num-asc', 'Tersedikit'], ['nama', 'Nama A–Z']]
const pc = (x: KItem) => (x.kontrak ?? 0) > 0 ? (x.real ?? 0) / (x.kontrak ?? 1) : -1
function cmp(s: string) {
  return (x: KItem, y: KItem) => {
    const sx = (x.kontrak ?? 0) - (x.real ?? 0), sy = (y.kontrak ?? 0) - (y.real ?? 0)
    switch (s) {
      case 'kontrak-asc': return (x.kontrak ?? 0) - (y.kontrak ?? 0); case 'real-desc': return (y.real ?? 0) - (x.real ?? 0); case 'real-asc': return (x.real ?? 0) - (y.real ?? 0)
      case 'sisa-desc': return sy - sx; case 'sisa-asc': return sx - sy; case 'pct-asc': return pc(x) - pc(y); case 'pct-desc': return pc(y) - pc(x)
      case 'lebih-desc': return -sx - -sy > 0 ? 1 : -sx - -sy < 0 ? -1 : 0; case 'num-desc': return (y.num ?? 0) - (x.num ?? 0); case 'num-asc': return (x.num ?? 0) - (y.num ?? 0)
      case 'nama': return x.name.localeCompare(y.name, 'id'); default: return (y.kontrak ?? 0) - (x.kontrak ?? 0)
    }
  }
}
function KList({ v, nav }: { v: KView; nav: KNav }) {
  const items = v.items ?? [], pair = items.some(i => i.kontrak != null), sorts = pair ? PAIR_SORTS : NUM_SORTS
  const [q, setQ] = useState(''), [s, setS] = useState(v.sort ?? sorts[0][0]), [all, setAll] = useState(false)
  const rows = useMemo(() => items.filter(i => !q.trim() || `${i.name} ${i.sub ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).sort(cmp(s)), [items, q, s])
  const show = all ? rows : rows.slice(0, 40), mx = Math.max(1, ...items.map(i => i.num ?? 0))
  if (!items.length) return <div className="km-empty">{v.empty ?? 'Tidak ada data.'}</div>
  return <section className="km-sec">
    <div className="km-bar"><h4>{v.itemsTitle ?? 'Daftar'} <em>{rows.length}</em></h4>
      <label className="km-search"><Search size={13} /><input type="search" aria-label="Cari" placeholder="Cari…" value={q} onChange={e => setQ(e.target.value)} /></label>
      <select aria-label="Urutkan" value={s} onChange={e => setS(e.target.value)}>{sorts.map(([k, l]) => <option key={k} value={k}>Urut: {l}</option>)}</select></div>
    {rows.length === 0 ? <div className="km-empty">Tidak ada yang cocok dengan “{q}”.</div> : pair
      ? <SideBySide mk={v.mk ?? ''} items={show.map<SbsItem>(i => ({ key: i.key, name: i.name, sub: i.sub, tag: i.tag, kontrak: i.kontrak ?? 0, real: i.real ?? 0, color: i.color, onClick: i.open ? () => nav.go(i.open!()) : undefined }))} />
      : <div className="km-num">{show.map(i => <button type="button" key={i.key} className="km-nr" disabled={!i.open} onClick={() => i.open && nav.go(i.open())}>
        <div className="sbs-n"><div className="sbs-nm" title={i.name}>{i.name}{i.tag}</div>{i.sub && <div className="kb-sub">{i.sub}</div>}</div>
        <div className="sbs-t"><div className="sbs-f" style={{ width: `${(i.num ?? 0) / mx * 100}%`, background: i.color }} /></div><b>{shortMT(i.num ?? 0)} MT</b>{i.open && <ChevronRight size={15} className="km-chev" />}</button>)}</div>}
    {rows.length > 40 && <button type="button" className="fchip mt-2" onClick={() => setAll(!all)}>{all ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${rows.length}`}</button>}
  </section>
}
function KModal({ stack, go, back, close }: { stack: KView[]; go: (v: KView) => void; back: () => void; close: () => void }) {
  const v = stack[stack.length - 1], box = useRef<HTMLDivElement>(null), scr = useRef<HTMLDivElement>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') (stack.length > 1 ? back : close)() }; document.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' } }, [stack.length, back, close])
  useEffect(() => { scr.current?.scrollTo({ top: 0 }); box.current?.focus() }, [stack.length])
  const nav = { go, close }
  return createPortal(<div className="km-back" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <div className="km" role="dialog" aria-modal="true" aria-label={v.title} tabIndex={-1} ref={box} style={{ ['--c' as any]: v.color ?? '#e6b457' }}>
      <header className="km-h">
        {stack.length > 1 && <button type="button" className="km-back-b" onClick={back} aria-label="Kembali"><ArrowLeft size={16} /></button>}
        <div className="min-w-0 flex-1">
          {stack.length > 1 && <nav className="km-crumb" aria-label="Jejak">{stack.slice(0, -1).map((s, i) => <span key={i}><button type="button" onClick={() => { for (let n = stack.length - 1; n > i; n--) back() }}>{s.title}</button><ChevronRight size={11} /></span>)}</nav>}
          <h3>{v.title}</h3>{v.sub && <p>{v.sub}</p>}</div>
        <button type="button" className="km-x" onClick={close} aria-label="Tutup"><X size={17} /></button>
      </header>
      <div className="km-b" ref={scr}>
        {v.stats && <div className="km-stats">{v.stats.map(s => <div key={s.l} className="km-stat"><span>{s.l}</span><b style={s.c ? { color: s.c } : undefined}>{s.v}</b></div>)}</div>}
        {v.note && <p className="km-note">{v.note}</p>}
        {v.body?.(nav)}
        {v.items && <KList key={stack.length + v.title} v={v} nav={nav} />}
      </div>
    </div></div>, document.body)
}
export function useKModal() {
  const [stack, setStack] = useState<KView[]>([])
  const open = useCallback((v: KView) => setStack([v]), [])
  const go = useCallback((v: KView) => setStack(s => [...s, v]), [])
  const back = useCallback(() => setStack(s => s.slice(0, -1)), [])
  const close = useCallback(() => setStack([]), [])
  return { open, node: stack.length ? <KModal stack={stack} go={go} back={back} close={close} /> : null }
}
export { fmtNum }
