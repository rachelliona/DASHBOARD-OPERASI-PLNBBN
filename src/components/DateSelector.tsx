import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { fmtDate } from '../domain/format'
export default function DateSelector() {
  const { asOf, setAsOf, snapList, snapState } = useStore(); const list = [...(snapList ?? [])].reverse(); const i = list.indexOf(asOf)
  const older = () => setAsOf(asOf ? list[i + 1] ?? asOf : list[0] ?? ''); const newer = () => setAsOf(i > 0 ? list[i - 1] : '')
  return <div className="flex items-center gap-1 text-xs" title={snapList && snapList.length === 0 ? 'Belum ada snapshot harian. Jalankan workflow "Snapshot Harian" di GitHub Actions.' : 'Pilih tanggal untuk melihat keadaan data pada hari itu'}>
    <CalendarDays size={14} className="text-[#e6b457]" />
    <button aria-label="Tanggal sebelumnya" className="p-1 rounded hover:bg-white/10 disabled:opacity-30" disabled={!list.length || (asOf !== '' && i === list.length - 1)} onClick={older}><ChevronLeft size={14} /></button>
    <select aria-label="Tanggal data" value={asOf} onChange={e => setAsOf(e.target.value)}><option value="">Langsung (hari ini)</option>{list.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}</select>
    <button aria-label="Tanggal berikutnya" className="p-1 rounded hover:bg-white/10 disabled:opacity-30" disabled={!asOf} onClick={newer}><ChevronRight size={14} /></button>
    {snapState && <span className="text-amber-300">{snapState}</span>}</div>
}
