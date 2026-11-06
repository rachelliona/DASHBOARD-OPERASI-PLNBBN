import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, Download, Search, ChevronDown, ChevronsLeft, ChevronsRight, Circle, Database, FileText, LayoutDashboard, LogOut, Map as MapIcon, Menu, Users, X } from 'lucide-react'
import { useStore } from './store'
import Ringkasan from './pages/Ringkasan'
import Laporan from './pages/Laporan'
import Peta from './pages/Peta'
import Dashboard from './pages/Dashboard'
import Linimasa from './pages/Linimasa'
import Eta from './pages/Eta'
import { MonitoringShipment, MonitoringPltu, SheetPage } from './pages/Monitoring'
import { RealisasiBulan, RealisasiRingkasan } from './pages/Realisasi'
import Sumber from './pages/Sumber'
import Pengaturan from './pages/Pengaturan'
import Login from './pages/Login'
import BuatHash from './pages/BuatHash'
import DateSelector from './components/DateSelector'
import Palette from './components/Palette'
import Megabar from './components/Megabar'
import { useAuth } from './auth'
import { NAV, NavItem } from './config/nav'
import { fmtDate } from './domain/format'
const TABS: [string, string, any][] = [['/', 'Ringkasan', LayoutDashboard], ['/peta', 'Peta', MapIcon], ['/laporan/harian', 'Laporan', FileText], ['/dashboard', 'Interaktif', Activity]]
const ICON: Record<string, any> = { dash: LayoutDashboard, map: MapIcon, file: FileText, activity: Activity, users: Users, db: Database }
const LOGO = import.meta.env.BASE_URL + 'logo-dark.png', MARK = import.meta.env.BASE_URL + 'logo-mark-dark.png'
function Item({ item, depth, rail, onExpand }: { item: NavItem; depth: number; rail?: boolean; onExpand?: () => void }) {
  const { pathname } = useLocation()
  const has = (it: NavItem): boolean => it.to ? decodeURI(pathname) === decodeURI(it.to) : !!it.children?.some(has)
  const [open, setOpen] = useState(() => has(item)); const Ic = item.icon ? ICON[item.icon] : null; const pad = { paddingLeft: 10 + depth * 12 }
  const lab = <>{depth === 0 ? (Ic ? <Ic size={17} className="shrink-0 nav-ic" /> : <Circle size={9} className="shrink-0" />) : null}<span className="truncate lbl">{item.label}</span></>
  if (rail && depth === 0) { const I = Ic ?? Circle; return item.to ? <NavLink to={item.to} end title={item.label} aria-label={item.label} className={({ isActive }) => 'navitem rail' + (isActive ? ' active' : '')}><I size={19} /></NavLink> : <button title={item.label} aria-label={item.label} onClick={() => { setOpen(true); onExpand?.() }} className={'navitem rail' + (has(item) ? ' active' : '')}><I size={19} /></button> }
  if (item.to) return <NavLink to={item.to} end style={pad} className={({ isActive }) => 'navitem flex items-center gap-2.5 rounded-xl py-2 pr-2 text-[13px] mb-0.5 ' + (isActive ? 'active' : 'text-slate-300')}>{lab}{item.soon && <span className="ml-1 text-[10px] text-amber-300">segera</span>}</NavLink>
  return <div><button style={pad} onClick={() => setOpen(!open)} aria-expanded={open} className={'navitem grp w-full flex items-center gap-2.5 text-left rounded-xl py-2 pr-2 text-[13px] font-semibold mb-0.5 ' + (has(item) ? 'text-[#f2c76b]' : 'text-slate-100')}>{lab}<ChevronDown size={14} className={'ml-auto text-slate-400 chev ' + (open ? 'open' : '')} /></button><div className={'cg ' + (open ? 'open' : '')}><div className="ml-3.5 pl-1 border-l border-white/10">{item.children!.map(c => <Item key={c.label} item={c} depth={depth + 1} />)}</div></div></div>
}
export default function App() {
  const { kinds, raw, intervalSec, asOf } = useStore(); const { user, logout } = useAuth(); const { pathname } = useLocation(); const [drawer, setDrawer] = useState(false); const [pal, setPal] = useState(false); const [inst, setInst] = useState<any>(null)
  const [rail, setRail] = useState(() => { try { return localStorage.getItem('pln-side') === '1' } catch { return false } })
  const toggleRail = (v: boolean) => { setRail(v); try { localStorage.setItem('pln-side', v ? '1' : '0') } catch { /* tanpa penyimpanan */ } }
  useEffect(() => { const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement; const typing = /INPUT|TEXTAREA|SELECT/.test(t?.tagName ?? ''); if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setPal(p => !p) } }; const b = (e: Event) => { e.preventDefault(); setInst(e) }; window.addEventListener('keydown', k); window.addEventListener('beforeinstallprompt', b); return () => { window.removeEventListener('keydown', k); window.removeEventListener('beforeinstallprompt', b) } }, [])
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [pathname])
  if (pathname === '/buat-hash') return <BuatHash />
  if (!user) return <Login />
  const last = [...Object.values(kinds), ...Object.values(raw)].map(d => d.at).filter(a => a !== '—').slice(-1)[0]
  return <div className="flex min-h-screen">
    {drawer && <div className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
    <nav data-rail={rail} className={'no-print sidebar shrink-0 p-3 overflow-y-auto fixed inset-y-0 left-0 z-50 w-[19rem] transition-[transform,width] duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ' + (rail ? 'lg:w-[84px]' : 'lg:w-[17rem]') + (drawer ? ' translate-x-0' : ' -translate-x-full')}>
      <div className="side-head"><div className="logo-plate"><img src={LOGO} alt="PLN Batubara Niaga" className="logo-full" /><img src={MARK} alt="PLN Batubara Niaga" className="logo-mark" /></div>
        <button aria-label="Tutup menu" className="absolute right-2 top-2 p-2 lg:hidden" onClick={() => setDrawer(false)}><X size={18} /></button></div>
      <div className="side-cap lbl"><i />Dashboard Operasi</div>
      {NAV.map(i => <Item key={i.label} item={i} depth={0} rail={rail} onExpand={() => toggleRail(false)} />)}
      {inst && <button onClick={async () => { inst.prompt(); await inst.userChoice; setInst(null) }} className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[#e6b457]/50 bg-[#e6b457]/10 py-2 text-xs text-[#f2c76b]"><Download size={14} />Pasang sebagai aplikasi</button>}
      <div className="side-foot"><div className="avatar" aria-hidden>{(user.nama || '?').trim().charAt(0).toUpperCase()}</div><div className="min-w-0 lbl"><div className="text-xs font-semibold truncate">{user.nama}</div><div className="text-[10px] text-emerald-300 flex items-center gap-1"><i className="pulse" />Terhubung</div></div><button onClick={logout} aria-label="Keluar" title="Keluar" className="ml-auto p-2 rounded-lg hover:bg-white/10 text-slate-300 lbl"><LogOut size={15} /></button></div>
      <button className="hidden lg:flex rail-toggle" onClick={() => toggleRail(!rail)} aria-label={rail ? 'Lebarkan menu' : 'Ciutkan menu'} title={rail ? 'Lebarkan menu' : 'Ciutkan menu'}>{rail ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /><span className="lbl">Ciutkan</span></>}</button></nav>
    <main className="flex-1 min-w-0">
      <header className="topbar no-print px-3 lg:px-5 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button aria-label="Buka menu" className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-white/10" onClick={() => setDrawer(true)}><Menu size={20} /></button>
        <img src={MARK} alt="" className="lg:hidden h-8 w-auto" /><div className="mr-auto min-w-0"><h1 className="text-sm font-bold leading-tight truncate"><span className="lg:hidden">Dashboard Operasi PLN BBN</span><span className="hidden lg:inline">Dashboard Operasi PLN Batubara Niaga</span></h1><p className="hidden lg:block text-[11px] text-slate-500">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p></div>
        <button aria-label="Cari (Ctrl+K)" onClick={() => setPal(true)} className="hidden lg:flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:text-white"><Search size={13} />Cari…<kbd className="ml-3 text-[10px] border border-white/15 rounded px-1">Ctrl K</kbd></button>
        <button aria-label="Cari" onClick={() => setPal(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/10"><Search size={19} /></button>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar"><DateSelector />
        {asOf ? <span className="badge past">◷ Data per {fmtDate(asOf)}</span> : <span className="badge live"><i className="pulse" />Langsung · {last ?? 'memuat…'}<span className="hidden md:inline"> · tiap {intervalSec} dtk</span></span>}</div>
        </header>
      <Megabar />
      <div key={pathname} className="route-bar no-print" />
      <div key={'p' + pathname} className="p-3 md:p-4 lg:p-6 page page-in pb-24 lg:pb-8"><Routes>
        <Route path="/" element={<Ringkasan />} /><Route path="/peta" element={<Peta />} />
        <Route path="/laporan" element={<Navigate to="/laporan/harian" replace />} /><Route path="/laporan/harian" element={<Laporan />} />
        <Route path="/eta" element={<Eta />} /><Route path="/linimasa" element={<Linimasa />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/shipment" element={<MonitoringShipment />} /><Route path="/pltu" element={<MonitoringPltu />} />
        <Route path="/realisasi" element={<RealisasiRingkasan />} /><Route path="/realisasi/:bulan" element={<RealisasiBulan />} />
        <Route path="/sheet/:name" element={<SheetPage />} /><Route path="/sumber-data" element={<Sumber />} /><Route path="/pengaturan" element={<Pengaturan />} />
      </Routes></div></main>
    <Palette open={pal} onClose={() => setPal(false)} />
    <nav className="no-print tabbar lg:hidden" aria-label="Menu utama">{TABS.map(([to, l, Ic]) => <NavLink key={to} to={to} end className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}><Ic size={19} /><span>{l}</span></NavLink>)}<button className="tab" onClick={() => setDrawer(true)}><Menu size={19} /><span>Menu</span></button></nav></div>
}
