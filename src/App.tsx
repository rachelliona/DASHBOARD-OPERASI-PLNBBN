import FoldInit from './components/FoldInit'
import PltuDetail from './pages/PltuDetail'
import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Activity, Download, Search, ChevronDown, ChevronsLeft, ChevronsRight, Circle, Database, FileSignature, ClipboardList, Ship, FlaskConical, FileText, LayoutDashboard, LogOut, Map as MapIcon, Menu, Users, X } from 'lucide-react'
import { useStore } from './store'
import Ringkasan from './pages/Ringkasan'
import Laporan from './pages/Laporan'
import Peta from './pages/Peta'
import SIPage from './pages/SI'
import SIEditor from './pages/SIEditor'
import Dashboard from './pages/Dashboard'
import Linimasa from './pages/Linimasa'
import Eta from './pages/Eta'
import GanttPage from './pages/Gantt'
import Analisis from './pages/Analisis'
import KinerjaMitra from './pages/KinerjaMitra'
import Kontrak from './pages/Kontrak'
import KontrakBanding from './pages/KontrakBanding'
import KontrakData from './pages/KontrakData'
import Simulasi from './pages/Simulasi'
import SIAnalitik from './pages/SIAnalitik'
import Kualitas from './pages/Kualitas'
import { MonitoringShipment, MonitoringPltu, SheetPage } from './pages/Monitoring'
import { RealisasiBulan, RealisasiRingkasan } from './pages/Realisasi'
import Sumber from './pages/Sumber'
import Pengaturan from './pages/Pengaturan'
import Login from './pages/Login'
import BuatHash from './pages/BuatHash'
import DateSelector from './components/DateSelector'
import Palette from './components/Palette'
import NotifBell from './components/NotifBell'
import Megabar from './components/Megabar'
import { useAuth } from './auth'
import { navFor, isAdmin, DATA_SHEETS, NavItem } from './config/nav'
import { fmtDate } from './domain/format'
import { setTheme, useTheme } from './theme'
import { InstallBanner, MobileMenu, PullToRefresh, Splash, usePageTitle } from './components/MobileApp'
import { WelcomePopup } from './components/WelcomePopup'
import { Moon, RefreshCw, Sun } from 'lucide-react'
const TABS: [string, string, any][] = [['/', 'Ringkasan', LayoutDashboard], ['/peta', 'Peta', MapIcon], ['/laporan/harian', 'Laporan', FileText], ['/kontrak', 'Kontrak', FileSignature]]
const ICON: Record<string, any> = { dash: LayoutDashboard, map: MapIcon, file: FileText, activity: Activity, users: Users, db: Database, contract: FileSignature, report: ClipboardList, ship: Ship, lab: FlaskConical }
const B = import.meta.env.BASE_URL
const Img = ({ mark, cls }: { mark?: boolean; cls: string }) => <><img src={B + (mark ? 'logo-mark-dark.png' : 'logo-dark.png')} alt="PLN Batubara Niaga" className={cls + ' lg-d'} /><img src={B + (mark ? 'logo-mark-light.png' : 'logo-light.png')} alt="PLN Batubara Niaga" className={cls + ' lg-l'} /></>
function RefreshBtn() { const { refreshNow, refreshing, lastRefresh, asOf, setAsOf } = useStore(); const [, tick] = useState(0); useEffect(() => { const id = setInterval(() => tick(x => x + 1), 15000); return () => clearInterval(id) }, [])
  const ago = lastRefresh ? Math.max(0, Math.round((Date.now() - lastRefresh) / 60000)) : null
  const tip = asOf ? `Sedang melihat salinan data ${asOf}. Klik untuk kembali ke data terkini dari sheet` : refreshing ? 'Memuat ulang data dari sheet…' : `Muat ulang data dari sheet sekarang${ago != null ? ` · terakhir ${ago < 1 ? 'baru saja' : ago + ' menit lalu'}` : ' · otomatis tiap menit'}`
  return <button type="button" aria-label="Muat ulang data" title={tip} data-tip={tip} disabled={refreshing} onClick={() => asOf ? setAsOf('') : refreshNow()} className="theme-btn"><RefreshCw size={16} className={refreshing ? 'spin-r' : ''} /><span className="hidden xl:inline text-[11px]">{refreshing ? 'Memuat…' : asOf ? 'Data terkini' : 'Refresh'}</span></button> }
function ThemeBtn() { const t = useTheme(); const light = t === 'light'; return <button aria-label={light ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'} title={light ? 'Mode gelap' : 'Mode terang'} onClick={() => setTheme(light ? 'dark' : 'light')} className="theme-btn">{light ? <Moon size={16} /> : <Sun size={16} />}<span className="hidden xl:inline text-[11px]">{light ? 'Gelap' : 'Terang'}</span></button> }
function SheetGuard({ admin }: { admin: boolean }) { const { name = '' } = useParams(); let n = name; try { n = decodeURIComponent(name) } catch { /* apa adanya */ } return !admin && DATA_SHEETS.has(n) ? <Navigate to="/" replace /> : <SheetPage /> }
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
  const { kinds, raw, intervalSec, asOf } = useStore(); const { user, logout } = useAuth(); const { pathname } = useLocation(); const [drawer, setDrawer] = useState(false); const [sheet, setSheet] = useState(false); const pageTitle = usePageTitle(navFor(isAdmin(user))); const [pal, setPal] = useState(false); const [inst, setInst] = useState<any>(null)
  const [rail, setRail] = useState(() => { try { return localStorage.getItem('pln-side') === '1' } catch { return false } })
  const toggleRail = (v: boolean) => { setRail(v); try { localStorage.setItem('pln-side', v ? '1' : '0') } catch { /* tanpa penyimpanan */ } }
  useEffect(() => { const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement; const typing = /INPUT|TEXTAREA|SELECT/.test(t?.tagName ?? ''); if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setPal(p => !p) } }; const b = (e: Event) => { e.preventDefault(); setInst(e) }; window.addEventListener('keydown', k); window.addEventListener('beforeinstallprompt', b); return () => { window.removeEventListener('keydown', k); window.removeEventListener('beforeinstallprompt', b) } }, [])
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { const f = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 52); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])
  if (pathname === '/buat-hash') return <BuatHash />
  if (!user) return <Login />
  const last = [...Object.values(kinds), ...Object.values(raw)].map(d => d.at).filter(a => a !== '—').slice(-1)[0]
  return <div className="flex min-h-screen">
    {drawer && <div className="no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}
    <nav data-rail={rail} className={'no-print sidebar shrink-0 p-3 overflow-y-auto fixed inset-y-0 left-0 z-50 w-[19rem] transition-[transform,width] duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ' + (rail ? 'lg:w-[84px]' : 'lg:w-[17rem]') + (drawer ? ' translate-x-0' : ' -translate-x-full')}>
      <div className="side-head"><Link to="/" aria-label="Ke beranda" className="logo-plate" style={{ display: 'block' }} onClick={() => setDrawer(false)}><Img cls="logo-full" /><Img mark cls="logo-mark" /></Link>
        <button aria-label="Tutup menu" className="absolute right-2 top-2 p-2 lg:hidden" onClick={() => setDrawer(false)}><X size={18} /></button></div>
      <div className="side-cap lbl"><i />Dashboard Operasi</div>
      {navFor(isAdmin(user)).map(i => <Item key={i.label} item={i} depth={0} rail={rail} onExpand={() => toggleRail(false)} />)}
      {inst && <button onClick={async () => { inst.prompt(); await inst.userChoice; setInst(null) }} className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[#e6b457]/50 bg-[#e6b457]/10 py-2 text-xs text-[#f2c76b]"><Download size={14} />Pasang sebagai aplikasi</button>}
      <div className="side-foot"><div className="avatar" aria-hidden>{(user.nama || '?').trim().charAt(0).toUpperCase()}</div><div className="min-w-0 lbl"><div className="text-xs font-semibold truncate">{user.nama}</div><div className="text-[10px] text-emerald-300 flex items-center gap-1"><i className="pulse" />Terhubung</div></div><button onClick={logout} aria-label="Keluar" title="Keluar" className="ml-auto p-2 rounded-lg hover:bg-white/10 text-slate-300 lbl"><LogOut size={15} /></button></div>
      <button className="hidden lg:flex rail-toggle" onClick={() => toggleRail(!rail)} aria-label={rail ? 'Lebarkan menu' : 'Ciutkan menu'} title={rail ? 'Lebarkan menu' : 'Ciutkan menu'}>{rail ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /><span className="lbl">Ciutkan</span></>}</button></nav>
    <main className="flex-1 min-w-0">
      <header className="topbar no-print px-3 lg:px-5 py-2">
        <div className="topgrid">
          <div className="top-l"><button type="button" aria-label="Buka menu" className="lg:hidden" style={{ background: 'none', border: 0, padding: 0, display: 'flex' }} onClick={() => setSheet(true)}><Img mark cls="h-8 w-auto" /></button><div className="min-w-0"><h1 className="text-sm font-bold leading-tight truncate"><span className="lg:hidden">{pageTitle}</span><span className="hidden lg:inline">Dashboard Operasi PLN Batubara Niaga</span></h1>
              <div className="hidden lg:flex items-center gap-2 mt-0.5 min-w-0">{asOf ? <span className="badge past">◷ Data per {fmtDate(asOf)}</span> : <span className="badge live"><i className="pulse" />Langsung · {last ?? 'memuat…'}</span>}</div></div></div>
          <button aria-label="Cari (Ctrl+K)" onClick={() => setPal(true)} className="top-search hidden lg:flex"><Search size={15} /><span>Cari halaman, PLTU, shipment…</span><kbd>Ctrl K</kbd></button>
          <div className="top-r"><span className="lg:hidden"><button aria-label="Cari" onClick={() => setPal(true)} className="theme-btn"><Search size={16} /></button></span><NotifBell /><RefreshBtn /><span className="hidden lg:contents"><ThemeBtn /></span><div className="hidden lg:block"><DateSelector /></div></div>
        </div>
        <div className="flex items-center gap-2 mt-2 lg:hidden overflow-x-auto no-scrollbar"><DateSelector />
          {asOf ? <span className="badge past">◷ Data per {fmtDate(asOf)}</span> : <span className="badge live"><i className="pulse" />Langsung · {last ?? 'memuat…'}</span>}</div>
      </header>
      <Megabar />
      <div key={pathname} className="route-bar no-print" />
      <div key={'p' + pathname} className="p-3 md:p-4 lg:p-6 page page-in pb-24 lg:pb-8"><Routes>
        <Route path="/" element={<Ringkasan />} /><Route path="/peta" element={<Peta />} />
        <Route path="/laporan" element={<Navigate to="/laporan/harian" replace />} /><Route path="/laporan/harian" element={<Laporan />} />
        <Route path="/kualitas" element={<Kualitas tab="home" />} />{(["home", "shipment", "umpire", "evaluasi"] as const).map(t => <Route key={t} path={"/kualitas/" + t} element={<Kualitas tab={t} />} />)}<Route path="/si" element={<SIPage />} />{(["dashboard", "rekap", "plot", "peta"] as const).map(t => <Route key={t} path={"/si/" + t} element={<SIAnalitik tab={t} />} />)}<Route path="/si/baru" element={<SIEditor mode="baru" />} /><Route path="/si/edit/:id" element={<SIEditor mode="edit" />} /><Route path="/si/revisi/:id" element={<SIEditor mode="revisi" />} /><Route path="/si/koreksi/:id" element={<SIEditor mode="koreksi" />} /><Route path="/si/kelola/:id" element={<SIEditor mode="kelola" />} /><Route path="/eta" element={<Eta />} /><Route path="/analisis" element={<Analisis />} /><Route path="/kinerja-mitra" element={<KinerjaMitra />} /><Route path="/kontrak" element={<Kontrak />} /><Route path="/kontrak/banding" element={<KontrakBanding />} /><Route path="/kontrak/data" element={<KontrakData />} /><Route path="/gantt" element={<GanttPage />} /><Route path="/simulasi" element={<Simulasi />} /><Route path="/linimasa" element={<Linimasa />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/shipment" element={<MonitoringShipment />} /><Route path="/pltu" element={<MonitoringPltu />} /><Route path="/pltu/:nama" element={<PltuDetail />} />
        <Route path="/realisasi" element={<RealisasiRingkasan />} /><Route path="/realisasi/:bulan" element={<RealisasiBulan />} />
        <Route path="/sheet/:name" element={<SheetGuard admin={isAdmin(user)} />} /><Route path="/sumber-data" element={isAdmin(user) ? <Sumber /> : <Navigate to="/" replace />} /><Route path="/pengaturan" element={isAdmin(user) ? <Pengaturan /> : <Navigate to="/" replace />} />
      </Routes></div></main>
    <FoldInit /><Palette open={pal} onClose={() => setPal(false)} />
    <MobileMenu open={sheet} onClose={() => setSheet(false)} nav={navFor(isAdmin(user))} user={user} onLogout={logout} onSearch={() => setPal(true)} /><InstallBanner /><PullToRefresh /><Splash /><WelcomePopup user={user} />
    <nav className="no-print tabbar lg:hidden" aria-label="Menu utama">{TABS.map(([to, l, Ic]) => <NavLink key={to} to={to} end onClick={() => { try { navigator.vibrate?.(6) } catch { /* abaikan */ } }} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}><i className="tab-ic"><Ic size={20} /></i><span>{l}</span></NavLink>)}<button className={'tab' + (sheet ? ' active' : '')} onClick={() => setSheet(true)}><i className="tab-ic"><Menu size={20} /></i><span>Menu</span></button></nav></div>
}
