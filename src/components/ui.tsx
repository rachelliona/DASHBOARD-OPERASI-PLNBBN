import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
export const Card = ({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="rounded-xl border border-white/10 bg-[#171a21] p-3 mb-3">{(title || right) && <div className="flex justify-between items-center mb-2"><h2 className="font-semibold text-xs tracking-wide">{title}</h2>{right}</div>}{children}</section>)
export const Empty = ({ text = 'Data Belum Tersedia', hint }: { text?: string; hint?: string }) => {
  const { status, bulanAktif } = useStore(); const s = status[bulanAktif]?.state
  const loading = text === 'Data Belum Tersedia' && (!s || s.startsWith('Memuat')); const failed = text === 'Data Belum Tersedia' && s === 'Gagal Diakses'
  return <Card><div className="text-center py-8"><p className="text-sm font-semibold text-[#e6b457]">{loading ? 'Memuat Data…' : failed ? 'Gagal Mengambil Data' : text}</p>
    {!loading && <p className="text-xs text-slate-400 mt-1">{hint ?? 'Muat ulang halaman atau impor CSV di'} <Link className="text-[#e6b457] underline" to="/sumber-data">Sumber Data dan Kualitas Data</Link>.</p>}</div></Card>
}
export const Kpi = ({ label, value, unit, note, tip, accent }: { label: string; value: string; unit?: string; note?: string; tip?: string; accent?: string }) => (
  <div title={tip} className="rounded-xl border border-white/10 bg-[#171a21] p-3" style={{ borderTop: `2px solid ${accent ?? '#2a2f3a'}` }}><div className="text-[11px] text-slate-400 leading-tight">{label}</div>
    <div className="text-lg font-bold num mt-0.5">{value} <span className="text-[11px] font-normal text-slate-400">{unit}</span></div>{note && <div className="text-[11px] text-slate-400">{note}</div>}</div>)
export const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={'rounded-md bg-[#d9a441] hover:bg-[#e6b457] text-[#15130d] font-medium disabled:opacity-40 px-2.5 py-1 text-xs ' + (p.className ?? '')} />
export const Bar = ({ pct, color }: { pct: number | null; color: string }) => <div className="h-1.5 rounded bg-white/10 overflow-hidden"><div style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%`, background: color }} className="h-full" /></div>
