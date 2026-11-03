import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, ChevronDown, ChevronRight, Database, FileText, LayoutDashboard, LogOut, Map as MapIcon, Menu, Users, X, Zap } from 'lucide-react'
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
import { useAuth } from './auth'
import { NAV, NavItem } from './config/nav'
import { fmtDate } from './domain/format'
const TABS: [string, string, any][] = [['/', 'Ringkasan', LayoutDashboard], ['/peta', 'Peta', MapIcon], ['/laporan/harian', 'Laporan', FileText], ['/dashboard', 'Interaktif', Activity]]
const ICON: Record<string, any> = { dash: LayoutDashboard, map: MapIcon, file: FileText, activity: Activity, users: Users, db: Database }
function Item({ item, depth }: { item: NavItem; depth: number }) {
  const { pathname } = useLocation()
  const has = (it: NavItem): boolean => it.to ? decodeURI(pathname) === decodeURI(it.to) : !!it.children?.some(has)
  const [open, setOpen] = useState(() => has(item)); const Ic = item.icon ? ICON[item.icon] : null; const pad = { paddingLeft: 10 + depth * 12 }
  const lab = <>{Ic && <Ic size={14} className="shrink-0" />}<span className="truncate">{item.label}</span></>
  if (item.to) return <NavLink to={item.to} end style={pad} className={({ isActive }) => 'navitem flex items-center gap-2 rounded-lg py-1.5 pr-2 text-xs mb-0.5 ' + (isActive ? 'active' : 'text-slate-300 hover:bg-white/5')}>{lab}{item.soon && <span className="ml-1 text-[10px] text-amber-300">segera</span>}</NavLink>
  return <div><button style={pad} onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-left rounded-lg py-1.5 pr-2 text-xs font-semibold text-slate-200 hover:bg-white/5 mb-0.5">{lab}<span className="ml-auto text-slate-500">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span></button>{open && <div className="ml-2 border-l border-white/5">{item.children!.map(c => <Item key={c.label} item={c} depth={depth + 1} />)}</div>}</div>
}
export default function App() {
  const { kinds, raw, intervalSec, asOf } = useStore(); const { user, logout } = useAuth(); const { pathname } = useLocation(); const [drawer, setDrawer] = useState(false)
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [pathname])
  if (pathname === '/buat-hash') return <BuatHash />
  if (!user) return <Login />
  const last = [...Object.values(kinds), ...Object.values(raw)].map(d => d.at).filter(a => a !== '—').slice(-1)[0]
  return <div className="flex min-h-screen">
    {drawer && <div className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
    <nav className={'no-print sidebar shrink-0 p-3 overflow-y-auto fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-56 lg:max-h-screen lg:translate-x-0 ' + (drawer ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center gap-2.5 px-1 mb-4"><span className="logo"><Zap size={16} strokeWidth={2.5} /></span><div><div className="font-bold text-[13px] leading-tight">PLN Batubara Niaga</div><div className="text-[10px] text-slate-500">Dashboard Operasi</div></div><button aria-label="Tutup menu" className="ml-auto p-2 lg:hidden" onClick={() => setDrawer(false)}><X size={18} /></button></div>
      {NAV.map(i => <Item key={i.label} item={i} depth={0} />)}
      <div className="lg:hidden mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400"><span>{user.nama}</span><button onClick={logout} className="flex items-center gap-1 p-1"><LogOut size={14} />Keluar</button></div></nav>
    <main className="flex-1 min-w-0">
      <header className="topbar no-print px-3 lg:px-5 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button aria-label="Buka menu" className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-white/10" onClick={() => setDrawer(true)}><Menu size={20} /></button>
        <div className="mr-auto min-w-0"><h1 className="text-sm font-bold leading-tight truncate"><span className="lg:hidden">Dashboard Operasi PLN BBN</span><span className="hidden lg:inline">Dashboard Operasi PLN Batubara Niaga</span></h1><p className="hidden lg:block text-[11px] text-slate-500">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p></div>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar"><DateSelector />
        {asOf ? <span className="badge past">◷ Data per {fmtDate(asOf)}</span> : <span className="badge live"><i className="pulse" />Langsung · {last ?? 'memuat…'}<span className="hidden md:inline"> · tiap {intervalSec} dtk</span></span>}</div>
        <span className="hidden lg:inline text-xs text-slate-400">{user.nama}</span><button onClick={logout} className="hidden lg:flex items-center gap-1 text-xs text-slate-400 hover:text-white"><LogOut size={13} />Keluar</button></header>
      <div className="p-3 md:p-4 lg:p-6 page pb-24 lg:pb-8"><Routes>
        <Route path="/" element={<Ringkasan />} /><Route path="/peta" element={<Peta />} />
        <Route path="/laporan" element={<Navigate to="/laporan/harian" replace />} /><Route path="/laporan/harian" element={<Laporan />} />
        <Route path="/eta" element={<Eta />} /><Route path="/linimasa" element={<Linimasa />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/shipment" element={<MonitoringShipment />} /><Route path="/pltu" element={<MonitoringPltu />} />
        <Route path="/realisasi" element={<RealisasiRingkasan />} /><Route path="/realisasi/:bulan" element={<RealisasiBulan />} />
        <Route path="/sheet/:name" element={<SheetPage />} /><Route path="/sumber-data" element={<Sumber />} /><Route path="/pengaturan" element={<Pengaturan />} />
      </Routes></div></main>
    <nav className="no-print tabbar lg:hidden" aria-label="Menu utama">{TABS.map(([to, l, Ic]) => <NavLink key={to} to={to} end className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}><Ic size={19} /><span>{l}</span></NavLink>)}<button className="tab" onClick={() => setDrawer(true)}><Menu size={19} /><span>Menu</span></button></nav></div>
}
