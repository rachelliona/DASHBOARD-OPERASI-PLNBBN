import { useStore } from '../store'
import { Btn, Card } from '../components/ui'
export default function Pengaturan() {
  const { threshold, setThreshold, clear, intervalSec, setIntervalSec } = useStore()
  return <Card title="Pengaturan"><label className="block text-xs mb-3">Ambang "Perlu Perhatian" (% pemenuhan provisional): <input type="number" min={1} max={100} value={threshold} onChange={e => setThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 70)))} /></label>
    <label className="block text-xs mb-3">Pembaruan otomatis data (detik, 30–600): <input type="number" min={30} max={600} value={intervalSec} onChange={e => setIntervalSec(Math.min(600, Math.max(30, Number(e.target.value) || 60)))} /></label>
    <Btn onClick={() => { if (confirm('Hapus semua data yang diimpor dari memori? Pemetaan kolom tetap tersimpan.')) clear() }}>Hapus Data dari Memori</Btn>
    <p className="text-xs text-slate-400 mt-3">Pembaruan otomatis dari URL belum aktif (lihat README). Tidak ada autentikasi di aplikasi ini; akses internal harus dibatasi oleh hosting/SSO yang disetujui.</p></Card>
}
