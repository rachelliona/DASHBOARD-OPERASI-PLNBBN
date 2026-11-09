import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Building2, Ship } from 'lucide-react'
import { useStore } from '../store'
import { NAV, NavItem } from '../config/nav'
const flat = (items: NavItem[], trail: string[] = []): { label: string; to: string; path: string }[] => items.flatMap(i => i.to ? [{ label: i.label, to: i.to, path: [...trail, i.label].join(' › ') }] : flat(i.children ?? [], [...trail, i.label]))
type R = { k: 'p' | 'l' | 's'; label: string; sub: string; to: string }
/** Pencarian cepat (Ctrl/⌘+K atau "/"): halaman, PLTU, dan shipment (No. SI / TB-BG). */
export default function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { all, monthly } = useStore(); const nav = useNavigate(); const [q, setQ] = useState(''); const [i, setI] = useState(0); const ref = useRef<HTMLInputElement>(null)
  const pages = useMemo(() => flat(NAV), []); const ships = (monthly ?? all)?.ships ?? []
  const res = useMemo<R[]>(() => {
    const t = q.trim().toLowerCase(); const out: R[] = []
    const P = pages.filter(p => !t || (p.path.toLowerCase().includes(t))).slice(0, t ? 6 : 8).map(p => ({ k: 'p' as const, label: p.label, sub: p.path, to: p.to })); out.push(...P)
    if (t.length >= 2) {
      const pl = [...new Set(ships.map(s => s.plant))].filter(n => n.toLowerCase().includes(t)).slice(0, 5); out.push(...pl.map(n => ({ k: 'l' as const, label: n, sub: 'PLTU · lihat shipment', to: '/shipment?q=' + encodeURIComponent(n) })))
      const sh = ships.filter(s => s.si.toLowerCase().includes(t) || s.tbbg.toLowerCase().includes(t)).slice(0, 6); out.push(...sh.map(s => ({ k: 's' as const, label: `SI ${s.si || '—'} · ${s.tbbg.split(';')[0] || '—'}`, sub: `${s.plant} · ${s.status || 'tanpa status'}`, to: '/shipment?q=' + encodeURIComponent(s.si || s.tbbg.split(';')[0]) })))
    }
    return out
  }, [q, pages, ships])
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => ref.current?.focus(), 30) } }, [open]); useEffect(() => setI(0), [q])
  if (!open) return null
  const go = (r?: R) => { if (!r) return; nav(r.to); onClose() }
  const Ic = { p: FileText, l: Building2, s: Ship }
  return <div className="no-print fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[10vh] bg-black/65 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pencarian cepat">
    <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[var(--s1)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-3 border-b border-white/10"><Search size={16} className="text-slate-400" />
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Cari halaman, PLTU, No. SI, atau kapal…" aria-label="Cari" className="flex-1 !border-0 !bg-transparent !py-3 text-sm"
          onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(res.length - 1, i + 1)) } else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)) } else if (e.key === 'Enter') go(res[i]); else if (e.key === 'Escape') onClose() }} />
        <kbd className="hidden sm:block text-[10px] text-slate-400 border border-white/15 rounded px-1.5 py-0.5">Esc</kbd></div>
      <ul className="max-h-[60vh] overflow-auto p-1.5" role="listbox">{res.length === 0 && <li className="p-4 text-xs text-slate-400">Tidak ditemukan.</li>}
        {res.map((r, n) => { const I = Ic[r.k]; return <li key={r.to + r.label + n} role="option" aria-selected={n === i}><button onMouseEnter={() => setI(n)} onClick={() => go(r)} className={'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ' + (n === i ? 'bg-white/10' : '')}>
          <I size={15} className="shrink-0 text-[#f2c76b]" /><span className="min-w-0"><span className="block text-[13px] truncate">{r.label}</span><span className="block text-[11px] text-slate-400 truncate">{r.sub}</span></span></button></li> })}</ul></div></div>
}
