import { useStore } from '../store'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { Btn, Card, PageHead } from '../components/ui'
import { KPI_DEFAULT, loadKpi, resetKpi, saveKpi, type KpiTahunan } from '../report/kpi'
const NUM: [keyof KpiTahunan, string][] = [['rencana', 'Rencana'], ['targetRkap', 'Target RKAP'], ['terkontrak', 'Terkontrak (total)'], ['rkapTerkontrak', 'Volume RKAP — Terkontrak'], ['rkapRealisasi', 'Volume RKAP — Realisasi'], ['proaktifTerkontrak', 'Proaktif Sourcing — Terkontrak'], ['proaktifRealisasi', 'Proaktif Sourcing — Realisasi']]
const BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
function KpiForm() {
  const [k, setK] = useState<KpiTahunan>(loadKpi); const [ok, setOk] = useState(false); const up = (p: Partial<KpiTahunan>) => { setK(v => ({ ...v, ...p })); setOk(false) }
  const arr = (key: 'y2025' | 'target' | 'prognosa', i: number, v: string) => up({ [key]: k[key].map((x, j) => j === i ? Number(v.replace(',', '.')) || 0 : x) } as any)
  return <Card title="Kartu KPI Tahunan — Laporan Harian (slide 1)"><p className="text-[11px] text-slate-400 mb-3">Angka ini berasal dari sheet Dashboard 1 dan belum dibaca otomatis, jadi diisi manual (bawaan: laporan 27 Okt 2026). Realisasi bulanan pada grafik dihitung otomatis dari data shipment.</p>
    <div className="grid sm:grid-cols-2 gap-x-4">{NUM.map(([f, l]) => <label key={f} className="block text-xs mb-2">{l} (MT)<input className="w-full" inputMode="numeric" value={k[f] as number} onChange={e => up({ [f]: Number(e.target.value.replace(/\D/g, '')) || 0 } as any)} /></label>)}</div>
    <div className="overflow-x-auto mt-2"><table className="text-[11px]"><thead><tr><th className="p-1 text-left">Juta MT (kumulatif)</th>{BL.map(b => <th key={b} className="p-1">{b}</th>)}</tr></thead><tbody>{([['y2025', 'Realisasi 2025'], ['target', 'Target 2026'], ['prognosa', 'Prognosa 2026']] as const).map(([key, l]) => <tr key={key}><td className="p-1 whitespace-nowrap">{l}</td>{k[key].map((v, i) => <td key={i} className="p-0.5"><input style={{ width: 54 }} inputMode="decimal" defaultValue={v} onBlur={e => arr(key, i, e.target.value)} /></td>)}</tr>)}</tbody></table></div>
    <div className="flex gap-2 mt-3"><Btn onClick={() => { saveKpi(k); setOk(true) }}>Simpan</Btn><Btn onClick={() => { resetKpi(); setK(KPI_DEFAULT); setOk(false) }}>Kembalikan bawaan</Btn>{ok && <span className="text-xs text-emerald-300 self-center">Tersimpan.</span>}</div></Card>
}
export default function Pengaturan() {
  const { threshold, setThreshold, clear, intervalSec, setIntervalSec } = useStore()
  return <><PageHead icon={Settings} color="#94a3b8" title="Pengaturan" sub="Ambang perhatian, interval pembaruan, dan memori data" /><Card title="Preferensi"><label className="block text-xs mb-3">Ambang "Perlu Perhatian" (% pemenuhan provisional): <input type="number" min={1} max={100} value={threshold} onChange={e => setThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 70)))} /></label>
    <label className="block text-xs mb-3">Pembaruan otomatis data (detik, 30–600): <input type="number" min={30} max={600} value={intervalSec} onChange={e => setIntervalSec(Math.min(600, Math.max(30, Number(e.target.value) || 60)))} /></label>
    <label className="block text-xs mb-3">Alamat dasar snapshot (kosongkan untuk otomatis): <input className="w-96" defaultValue={localStorage.getItem('pln-snap-base') ?? ''} onBlur={e => { e.target.value.trim() ? localStorage.setItem('pln-snap-base', e.target.value.trim()) : localStorage.removeItem('pln-snap-base') }} placeholder="https://raw.githubusercontent.com/…/data/snapshots" /></label>
    <Btn onClick={() => { if (confirm('Hapus semua data yang diimpor dari memori? Pemetaan kolom tetap tersimpan.')) clear() }}>Hapus Data dari Memori</Btn>
    <p className="text-xs text-slate-400 mt-3">Pembaruan otomatis dari URL belum aktif (lihat README). Tidak ada autentikasi di aplikasi ini; akses internal harus dibatasi oleh hosting/SSO yang disetujui.</p></Card><KpiForm /></>
}
