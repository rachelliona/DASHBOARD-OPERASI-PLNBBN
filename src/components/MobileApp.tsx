import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ChevronRight, Database, Download, FileSignature, FileText, LayoutDashboard, LogOut, Map as MapIcon, Moon, RefreshCw, Share, Sun, Users, X, PlusSquare } from 'lucide-react'
import { NavItem } from '../config/nav'
import { setTheme, useTheme } from '../theme'
import { useStore } from '../store'

const ICON: Record<string, any> = { dash: LayoutDashboard, map: MapIcon, file: FileText, activity: Activity, users: Users, db: Database, contract: FileSignature }
const flat = (n: NavItem, acc: { label: string; to: string }[] = []) => { if (n.to) acc.push({ label: n.label, to: n.to }); n.children?.forEach(c => flat(c, acc)); return acc }
/** Judul halaman untuk header ponsel (mengambil dari menu). */
export function usePageTitle(nav: NavItem[]) {
  const { pathname } = useLocation()
  return useMemo(() => { const all = nav.flatMap(n => flat(n)); const hit = all.filter(x => x.to === pathname || (x.to !== '/' && pathname.startsWith(x.to + '/'))).sort((a, b) => b.to.length - a.to.length)[0]
    return hit?.label ?? (pathname.startsWith('/pltu/') ? decodeURIComponent(pathname.slice(6)) : 'Dashboard Operasi') }, [pathname, nav])
}

/* ---------- Pasang aplikasi (Android/Chrome: prompt asli; iPhone: panduan Tambah ke Layar Utama) ---------- */
const standalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true } catch { return false } }
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
let deferred: any = null; const subs = new Set<() => void>()
if (typeof window !== 'undefined') { window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; subs.forEach(f => f()) }); window.addEventListener('appinstalled', () => { deferred = null; subs.forEach(f => f()) }) }
export function useInstall() {
  const [, force] = useState(0); useEffect(() => { const f = () => force(x => x + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  const installed = standalone(), ios = isIOS(), can = !installed && (!!deferred || ios)
  const [guide, setGuide] = useState(false)
  const install = useCallback(async () => { if (deferred) { deferred.prompt(); try { await deferred.userChoice } catch { /* abaikan */ } deferred = null; subs.forEach(f => f()) } else setGuide(true) }, [])
  return { can, installed, ios, install, guide, setGuide }
}
export function IosGuide({ onClose }: { onClose: () => void }) {
  const steps: [any, string, string][] = [[Share, 'Ketuk tombol Bagikan', 'Ikon kotak dengan panah ke atas di bilah bawah Safari.'], [PlusSquare, 'Pilih “Tambah ke Layar Utama”', 'Gulir daftar aksi ke bawah sampai opsi ini muncul.'], [Download, 'Ketuk “Tambah”', 'Ikon aplikasi muncul di layar utama dan terbuka layar penuh tanpa bilah Safari.']]
  return createPortal(<div className="ma-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="ma-sheet" role="dialog" aria-modal="true" aria-label="Pasang aplikasi">
    <div className="ma-grab" /><div className="ma-head"><img src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" /><div><h3>Pasang di iPhone</h3><p>Buka di Safari, lalu tiga langkah ini.</p></div><button type="button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>
    <ol className="ma-steps">{steps.map(([Ic, t, d], i) => <li key={i}><span className="ma-n">{i + 1}</span><Ic size={20} /><div><b>{t}</b><small>{d}</small></div></li>)}</ol>
    <p className="ma-note">Setelah terpasang, aplikasi tetap menampilkan data terbaru dari sheet dan bisa dibuka cepat dari layar utama.</p></div></div>, document.body)
}
/** Banner ajakan pasang (sekali, bisa ditutup) — hanya di ponsel, bila belum terpasang. */
export function InstallBanner() {
  const { can, install, guide, setGuide } = useInstall(); const [hide, setHide] = useState(() => { try { return localStorage.getItem('pln-install-dismiss') === '1' } catch { return false } })
  if (!can || hide) return guide ? <IosGuide onClose={() => setGuide(false)} /> : null
  return <><div className="ma-banner lg:hidden no-print" role="region" aria-label="Pasang aplikasi"><img src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" /><div className="min-w-0"><b>Pasang sebagai aplikasi</b><small>Buka cepat dari layar utama, layar penuh.</small></div>
    <button type="button" className="ma-go" onClick={install}>Pasang</button><button type="button" className="ma-x" aria-label="Tutup" onClick={() => { setHide(true); try { localStorage.setItem('pln-install-dismiss', '1') } catch { /* abaikan */ } }}><X size={15} /></button></div>{guide && <IosGuide onClose={() => setGuide(false)} />}</>
}

/* ---------- Menu ala aplikasi (bottom sheet dengan ubin) ---------- */
export function MobileMenu({ open, onClose, nav, user, onLogout, onSearch }: { open: boolean; onClose: () => void; nav: NavItem[]; user: { nama: string }; onLogout: () => void; onSearch: () => void }) {
  const t = useTheme(), light = t === 'light', { refreshNow, refreshing, asOf, setAsOf } = useStore(), inst = useInstall(); const go = useNavigate(), { pathname } = useLocation()
  const [grp, setGrp] = useState<string | null>(null); useEffect(() => { if (open) setGrp(null) }, [open]); useEffect(() => { onClose() }, [pathname]) // eslint-disable-line
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') (grp ? setGrp(null) : onClose()) }; document.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' } }, [open, grp, onClose])
  if (!open) return inst.guide ? <IosGuide onClose={() => inst.setGuide(false)} /> : null
  const cur = grp ? nav.find(n => n.label === grp) : null
  const Row = ({ n, depth = 0 }: { n: NavItem; depth?: number }): ReactNode => n.children ? <div key={n.label} className="ma-sub"><div className="ma-subh" style={{ paddingLeft: depth * 10 }}>{n.label}</div>{n.children.map(c => <Row key={c.label} n={c} depth={depth + 1} />)}</div>
    : <NavLink key={n.label} to={n.to ?? '/'} end className={({ isActive }) => 'ma-link' + (isActive ? ' on' : '')} style={{ paddingLeft: 14 + depth * 10 }} onClick={onClose}>{n.label}<ChevronRight size={14} /></NavLink>
  return createPortal(<div className="ma-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="ma-sheet tall" role="dialog" aria-modal="true" aria-label="Menu">
    <div className="ma-grab" />
    <div className="ma-head"><div className="ma-av">{(user.nama || '?').trim().charAt(0).toUpperCase()}</div><div><h3>{grp ?? 'Menu'}</h3><p>{grp ? 'Pilih halaman' : `Halo, ${user.nama}`}</p></div>
      {grp ? <button type="button" onClick={() => setGrp(null)} aria-label="Kembali">‹</button> : <button type="button" onClick={onClose} aria-label="Tutup"><X size={18} /></button>}</div>
    <div className="ma-body">
      {!cur ? <>
        <button type="button" className="ma-search" onClick={() => { onClose(); onSearch() }}>Cari halaman, PLTU, shipment…</button>
        <div className="ma-grid">{nav.map(n => { const Ic = n.icon ? ICON[n.icon] : FileText; return n.to
          ? <button type="button" key={n.label} className={'ma-tile' + (pathname === n.to ? ' on' : '')} onClick={() => go(n.to!)}><Ic size={22} /><span>{n.label}</span></button>
          : <button type="button" key={n.label} className="ma-tile" onClick={() => setGrp(n.label)}><Ic size={22} /><span>{n.label}</span><ChevronRight size={14} className="ma-ch" /></button> })}</div>
        <div className="ma-actions">
          {inst.can && <button type="button" className="ma-act gold" onClick={() => { inst.install() }}><Download size={18} /><div><b>Pasang aplikasi</b><small>{inst.ios ? 'Tambah ke Layar Utama iPhone' : 'Buka layar penuh dari layar utama'}</small></div></button>}
          <button type="button" className="ma-act" onClick={() => asOf ? setAsOf('') : refreshNow()} disabled={refreshing}><RefreshCw size={18} className={refreshing ? 'spin-r' : ''} /><div><b>{asOf ? 'Kembali ke data terkini' : refreshing ? 'Memuat…' : 'Muat ulang data'}</b><small>{asOf ? `Sedang melihat ${asOf}` : 'Ambil angka terbaru dari sheet'}</small></div></button>
          <button type="button" className="ma-act" onClick={() => setTheme(light ? 'dark' : 'light')}>{light ? <Moon size={18} /> : <Sun size={18} />}<div><b>Mode {light ? 'gelap' : 'terang'}</b><small>Ganti tampilan</small></div></button>
          <button type="button" className="ma-act" onClick={onLogout}><LogOut size={18} /><div><b>Keluar</b><small>{user.nama}</small></div></button></div>
      </> : <div className="ma-list">{(cur.children ?? []).map(c => <Row key={c.label} n={c} />)}</div>}
    </div></div>{inst.guide && <IosGuide onClose={() => inst.setGuide(false)} />}</div>, document.body)
}

/* ---------- Tarik ke bawah untuk memuat ulang (mode aplikasi / layar sentuh) ---------- */
export function PullToRefresh() {
  const { refreshNow, refreshing, asOf } = useStore(); const [pull, setPull] = useState(0); const y0 = useRef<number | null>(null), pr = useRef(0)
  useEffect(() => {
    if (!('ontouchstart' in window)) return
    const ts = (e: TouchEvent) => { y0.current = window.scrollY <= 0 && !document.body.style.overflow && !(e.target as HTMLElement).closest?.('[role=dialog],.leaflet-container,table,.overflow-x-auto') ? e.touches[0].clientY : null }
    const tm = (e: TouchEvent) => { if (y0.current == null) return; const d = e.touches[0].clientY - y0.current; if (d > 0 && window.scrollY <= 0) { pr.current = Math.min(110, d * .5); setPull(pr.current) } else if (d < 0) { y0.current = null; pr.current = 0; setPull(0) } }
    const te = () => { if (y0.current != null && pr.current >= 64 && !asOf) refreshNow(); y0.current = null; pr.current = 0; setPull(0) }
    window.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', te); window.addEventListener('touchcancel', te)
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); window.removeEventListener('touchcancel', te) }
  }, [refreshNow, asOf])
  const show = pull > 6 || refreshing
  return <div className="ma-ptr lg:hidden no-print" aria-hidden style={{ transform: `translate(-50%, ${show ? (refreshing ? 14 : pull - 34) : -60}px)`, opacity: show ? 1 : 0 }}><RefreshCw size={16} className={refreshing ? 'spin-r' : ''} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} /><span>{refreshing ? 'Memuat…' : pull >= 64 ? 'Lepas untuk memuat ulang' : 'Tarik untuk memuat ulang'}</span></div>
}
