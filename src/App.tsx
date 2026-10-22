import { useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store'
import Ringkasan from './pages/Ringkasan'
import Laporan from './pages/Laporan'
import Peta from './pages/Peta'
import { MonitoringShipment, MonitoringPltu, SheetPage } from './pages/Monitoring'
import Sumber from './pages/Sumber'
import Pengaturan from './pages/Pengaturan'
import Login from './pages/Login'
import BuatHash from './pages/BuatHash'
import { useAuth } from './auth'
import { Card } from './components/ui'
import { NAV, NavItem } from './config/nav'
const Segera = ({ title, why }: { title: string; why: string }) => <Card title={title}><p className="text-xs text-slate-400">Belum tersedia. {why}</p></Card>
function Item({ item, depth }: { item: NavItem; depth: number }) {
  const { pathname } = useLocation()
  const has = (it: NavItem): boolean => it.to ? decodeURI(pathname) === decodeURI(it.to) : !!it.children?.some(has)
  const [open, setOpen] = useState(() => has(item))
  const pad = { paddingLeft: 8 + depth * 12 }
  if (item.to) return <NavLink to={item.to} end style={pad} className={({ isActive }) => 'block rounded py-1 pr-2 text-xs ' + (isActive ? 'bg-sky-700' : 'hover:bg-sky-900/50')}>{item.label}{item.soon && <span className="ml-1 text-[10px] text-amber-300">segera</span>}</NavLink>
  return <div><button style={pad} onClick={() => setOpen(!open)} className="w-full text-left rounded py-1 pr-2 text-xs font-semibold hover:bg-sky-900/50">{open ? '▾' : '▸'} {item.label}</button>{open && item.children!.map(c => <Item key={c.label} item={c} depth={depth + 1} />)}</div>
}
export default function App() {
  const { kinds, raw, intervalSec } = useStore(); const { user, logout } = useAuth(); const { pathname } = useLocation()
  if (pathname === '/buat-hash') return <BuatHash />
  if (!user) return <Login />
  const last = [...Object.values(kinds), ...Object.values(raw)].map(d => d.at).slice(-1)[0]
  return <div className="flex min-h-screen">
    <nav className="no-print w-52 shrink-0 bg-[#041029] p-2 border-r border-sky-900/60 overflow-y-auto max-h-screen sticky top-0"><div className="font-bold text-sm mb-2 px-2">PLN Batubara Niaga</div>{NAV.map(i => <Item key={i.label} item={i} depth={0} />)}</nav>
    <main className="flex-1 p-3 min-w-0">
      <header className="mb-3"><h1 className="text-base font-bold">Dashboard Operasi PLN Batubara Niaga</h1><p className="text-xs text-slate-400">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p>
        <p className="text-[11px] text-slate-500 no-print">{last ? `Pembaruan terakhir: ${last}` : 'Belum ada data dimuat'} · Pembaruan otomatis tiap {intervalSec} dtk untuk sheet yang dibuka · Masuk sebagai {user.nama} <button className="underline" onClick={logout}>Keluar</button></p></header>
      <Routes>
        <Route path="/" element={<Ringkasan />} /><Route path="/peta" element={<Peta />} />
        <Route path="/laporan" element={<Navigate to="/laporan/harian" replace />} /><Route path="/laporan/harian" element={<Laporan />} />
        <Route path="/laporan/mingguan" element={<Segera title="Laporan Mingguan" why="Perlu kesepakatan definisi periode mingguan dan sumber data; snapshot harian belum tersimpan." />} />
        <Route path="/laporan/bulanan" element={<Segera title="Laporan Bulanan" why="Perlu kesepakatan format laporan bulanan dan sumber data." />} />
        <Route path="/shipment" element={<MonitoringShipment />} /><Route path="/pltu" element={<MonitoringPltu />} />
        <Route path="/sheet/:name" element={<SheetPage />} />
        <Route path="/sumber-data" element={<Sumber />} /><Route path="/pengaturan" element={<Pengaturan />} />
      </Routes></main></div>
}
