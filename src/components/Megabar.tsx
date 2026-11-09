import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, ChevronDown, Clock, Database, Factory, FileText, LayoutDashboard, Map as MapIcon, Settings, Ship, Table2, Users, Waypoints } from 'lucide-react'
import { navFor, isAdmin, NavItem } from '../config/nav'
import { useAuth } from '../auth'
const ICON: Record<string, any> = { dash: LayoutDashboard, map: MapIcon, file: FileText, activity: Activity, users: Users, db: Database }
const LEAF: Record<string, any> = { '/dashboard': Activity, '/shipment': Ship, '/eta': Clock, '/linimasa': Waypoints, '/pltu': Factory, '/realisasi': BarChart3, '/sumber-data': Database, '/pengaturan': Settings }
const same = (a: string, b: string) => { try { return decodeURI(a) === decodeURI(b) } catch { return a === b } }
const has = (it: NavItem, p: string): boolean => it.to ? same(p, it.to) : !!it.children?.some(c => has(c, p))
const leaves = (it: NavItem): NavItem[] => it.to ? [it] : (it.children ?? []).flatMap(leaves)
/** Menu atas gaya mega-menu: ikon di atas label, panel terbuka saat disorot atau diklik. Hanya desktop. */
export default function Megabar() {
  const { pathname } = useLocation(); const { user } = useAuth(); const NAVX = navFor(isAdmin(user)); const [open, setOpen] = useState<string | null>(null); const t = useRef<number>(); const box = useRef<HTMLDivElement>(null)
  useEffect(() => setOpen(null), [pathname])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null); const c = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(null) }; window.addEventListener('keydown', k); window.addEventListener('mousedown', c); return () => { window.removeEventListener('keydown', k); window.removeEventListener('mousedown', c) } }, [])
  const show = (l: string) => { window.clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(l), 90) }
  const hide = () => { window.clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(null), 220) }
  const cur = NAVX.find(n => n.label === open && n.children)
  return <div ref={box} className="megabar no-print hidden lg:block" onMouseLeave={hide} onMouseEnter={() => window.clearTimeout(t.current)}>
    <div className="mega-row" role="menubar" aria-label="Menu utama">
      {NAVX.map(n => { const I = ICON[n.icon ?? ''] ?? Table2; const on = has(n, pathname)
        if (n.to) return <NavLink key={n.label} to={n.to} end role="menuitem" onMouseEnter={() => show('')} className={'mega-tile' + (on ? ' active' : '')}><I size={22} /><span>{n.label}</span></NavLink>
        return <button key={n.label} role="menuitem" aria-haspopup="true" aria-expanded={open === n.label} onMouseEnter={() => show(n.label)} onClick={() => setOpen(open === n.label ? null : n.label)} className={'mega-tile' + (on || open === n.label ? ' active' : '')}><I size={22} /><span>{n.label}<ChevronDown size={12} className={'inline ml-1 transition-transform ' + (open === n.label ? 'rotate-180' : '')} /></span></button> })}
    </div>
    {cur && <div className="mega-panel" role="menu"><div className="mega-in">
      {(() => { const direct = cur.children!.filter(c => c.to), groups = cur.children!.filter(c => !c.to)
        return <>
          {direct.length > 0 && <div className="mega-sec"><h4>{cur.label}</h4><div className="mega-cards">{direct.map(c => { const I = LEAF[c.to!] ?? Table2; return <NavLink key={c.label} to={c.to!} end role="menuitem" className={({ isActive }) => 'mega-card' + (isActive ? ' active' : '')}><I size={18} /><span>{c.label}</span></NavLink> })}</div></div>}
          {groups.map(g => { const subs = g.children!.filter(x => !x.to), top = g.children!.filter(x => x.to)
            return <div key={g.label} className="mega-sec"><h4>{g.label}</h4>
              <div className="mega-chips">{top.map(c => <NavLink key={c.label} to={c.to!} end role="menuitem" className={({ isActive }) => 'mega-chip' + (isActive ? ' active' : '')}>{c.label}</NavLink>)}</div>
              {subs.map(s => <div key={s.label} className="mt-2"><p className="mega-sub">{s.label}</p><div className="mega-chips">{leaves(s).map(c => <NavLink key={c.label} to={c.to!} end role="menuitem" className={({ isActive }) => 'mega-chip' + (isActive ? ' active' : '')}>{c.label}</NavLink>)}</div></div>)}</div> })}
        </> })()}
    </div></div>}
  </div>
}
