import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { fmtNum, parseIdNumber } from '../domain/format'
export const Card = ({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="rounded-xl border border-white/10 bg-[#171a21] p-3 mb-3">{(title || right) && <div className="flex justify-between items-center mb-2"><h2 className="font-semibold text-xs tracking-wide">{title}</h2>{right}</div>}{children}</section>)
export const Empty = ({ text = 'Data Belum Tersedia', hint }: { text?: string; hint?: string }) => {
  const { status, bulanAktif, asOf, snapState } = useStore(); const s = asOf ? snapState : status[bulanAktif]?.state; const dflt = text === 'Data Belum Tersedia'
  const loading = dflt && (asOf ? s.startsWith('Memuat') : (!s || s.startsWith('Memuat'))); const failed = dflt && (asOf ? s.startsWith('Gagal') : s === 'Gagal Diakses')
  if (loading) return <div role="status"><p className="sr-only">Memuat Data…</p><Skeleton /></div>
  return <Card><div className="text-center py-8"><p className="text-sm font-semibold text-[#e6b457]">{failed ? 'Gagal Mengambil Data' : text}</p>
    {!loading && <p className="text-xs text-slate-400 mt-1">{hint ?? 'Muat ulang halaman atau impor CSV di'} <Link className="text-[#e6b457] underline" to="/sumber-data">Sumber Data dan Kualitas Data</Link>.</p>}</div></Card>
}
/** Angka KPI berhitung naik saat tampil; teks non-angka ditampilkan apa adanya. */
function Anim({ v }: { v: string }) {
  const m = v.match(/^(-?[\d.]+)(?:,(\d+))?(%?)$/); const target = m ? parseIdNumber(m[1] + (m[2] ? ',' + m[2] : '')) : null; const [cur, setCur] = useState<number | null>(null)
  useEffect(() => { if (target == null) return; let raf = 0; const t0 = performance.now(); const tick = (t: number) => { const k = Math.min(1, (t - t0) / 750); setCur(target * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick) }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf) }, [target])
  if (!m || target == null || cur == null) return <>{v}</>
  return <>{fmtNum(cur, m[2]?.length ?? 0)}{m[3]}</>
}
export const Kpi = ({ label, value, unit, note, tip, accent }: { label: string; value: string; unit?: string; note?: string; tip?: string; accent?: string }) => (
  <div title={tip} className="kpi" style={{ ['--ac' as any]: accent ?? '#2a2f3a' }}><div className="text-[10.5px] uppercase tracking-wider text-slate-400 leading-tight">{label}</div>
    <div className="text-[22px] font-bold num mt-1 leading-none"><Anim v={value} /> <span className="text-[11px] font-normal text-slate-400">{unit}</span></div>{note && <div className="text-[11px] text-slate-400 mt-1">{note}</div>}</div>)
/** Pil filter wilayah: teks netral + titik warna wilayah, supaya tidak bertabrakan dengan warna tahapan. */
export const RegionChip = ({ label, color, on, onClick }: { label: string; color?: string; on: boolean; onClick: () => void }) => (
  <button onClick={onClick} aria-pressed={on} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs" style={{ borderColor: on ? '#f1f5f9' : 'rgba(255,255,255,.22)', background: on ? '#f1f5f9' : 'rgba(255,255,255,.03)', color: on ? '#0f1217' : '#e5e9f0', fontWeight: on ? 600 : 400 }}>
    {color && <i style={{ width: 8, height: 8, borderRadius: 99, background: color, boxShadow: on ? '0 0 0 1.5px #0f1217' : 'none' }} />}{label}</button>)
export const Skeleton = ({ rows = 3 }: { rows?: number }) => <div className="space-y-3" aria-busy="true" aria-label="Memuat data"><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[0, 1, 2, 3].map(i => <div key={i} className="skel h-[78px] rounded-2xl" />)}</div>{Array.from({ length: rows }, (_, i) => <div key={i} className="skel h-24 rounded-2xl" />)}</div>
export const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={'rounded-md bg-[#d9a441] hover:bg-[#e6b457] text-[#15130d] font-medium disabled:opacity-40 px-2.5 py-1 text-xs ' + (p.className ?? '')} />
export const Bar = ({ pct, color }: { pct: number | null; color: string }) => <div className="h-1.5 rounded bg-white/10 overflow-hidden"><div style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, animation: 'grow .9s cubic-bezier(.2,.8,.2,1) both' }} className="h-full rounded" /></div>
