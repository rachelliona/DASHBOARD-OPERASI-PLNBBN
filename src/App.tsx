import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import Ringkasan from './pages/Ringkasan'
import Laporan from './pages/Laporan'
import Peta from './pages/Peta'
import { MonitoringShipment, MonitoringPltu, RawPage } from './pages/Monitoring'
import Sumber from './pages/Sumber'
import Pengaturan from './pages/Pengaturan'
import { GROUPS } from './config/sources'
const NAV: [string, string][] = [['/', 'Ringkasan Eksekutif'], ['/peta', 'Peta Shipment Indonesia'], ['/laporan', 'Laporan Harian'], ['/shipment', 'Monitoring Shipment'], ['/pltu', 'Monitoring Pasokan PLTU'], ['/realisasi', 'Realisasi dan Pasokan'], ['/mitra', 'Mitra dan Kepatuhan'], ['/si', 'SI dan Penugasan'], ['/sumber-data', 'Sumber Data dan Kualitas Data'], ['/pengaturan', 'Pengaturan']]
export default function App() {
  const { kinds, raw } = useStore()
  const all = [...Object.values(kinds), ...Object.values(raw)]; const last = all.map(d => d.at).slice(-1)[0]
  return <div className="flex min-h-screen">
    <nav className="no-print w-60 shrink-0 bg-[#041029] p-3 border-r border-sky-900/60"><div className="font-bold mb-4">PLN Batubara Niaga</div>
      {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'block rounded px-3 py-2 text-sm mb-1 ' + (isActive ? 'bg-sky-700' : 'hover:bg-sky-900/50')}>{l}</NavLink>)}</nav>
    <main className="flex-1 p-4 min-w-0">
      <header className="mb-4"><h1 className="text-xl font-bold">Dashboard Operasi PLN Batubara Niaga</h1><p className="text-sm text-slate-400">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p>
        <p className="text-xs text-slate-500 no-print">{last ? `Pembaruan terakhir: ${last}` : 'Belum ada data dimuat'} · Data hanya di memori peramban, bukan data langsung (live)</p></header>
      <Routes>
        <Route path="/" element={<Ringkasan />} /><Route path="/peta" element={<Peta />} /><Route path="/laporan" element={<Laporan />} />
        <Route path="/shipment" element={<MonitoringShipment />} /><Route path="/pltu" element={<MonitoringPltu />} />
        <Route path="/realisasi" element={<RawPage title="Realisasi dan Pasokan" sheets={GROUPS.realisasi} />} />
        <Route path="/mitra" element={<RawPage title="Mitra dan Kepatuhan" sheets={GROUPS.mitra} />} />
        <Route path="/si" element={<RawPage title="SI dan Penugasan" sheets={GROUPS.si} />} />
        <Route path="/sumber-data" element={<Sumber />} /><Route path="/pengaturan" element={<Pengaturan />} />
      </Routes></main></div>
}
