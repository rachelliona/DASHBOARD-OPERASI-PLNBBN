import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Brain, ArrowRight } from 'lucide-react'
import { Ship, BULAN } from '../domain/monthly'
import { buildInsights, SEV_COLOR, todayRef } from '../domain/insight'
import { useStore } from '../store'
import { readCmp } from '../pages/useBulan'
/** Ringkasan 3 temuan teratas di halaman Ringkasan; rincian lengkap di Analisis. */
export default function InsightTeaser({ ships, bulan }: { ships: Ship[]; bulan: string }) {
  const { asOf, all } = useStore(); const ref = asOf ? Date.parse(asOf) : todayRef()
  const o = useMemo(() => buildInsights({ ships, ref, bulanIdx: BULAN.indexOf(bulan), base: all?.ships, cmp: readCmp() }), [ships, ref, bulan, all]); const top = o.list.slice(0, 3)
  return <section className="gcard mb-3"><div className="flex flex-wrap items-center gap-2 mb-2"><h2 className="gcard-t"><Brain size={15} />Temuan otomatis</h2>
    <span className="text-[11px] text-slate-400">{o.ringkas.tinggi} prioritas tinggi · {o.ringkas.sedang} perlu perhatian</span><Link to="/analisis" className="ml-auto text-xs text-[#f2c76b] flex items-center gap-1">Lihat semua <ArrowRight size={13} /></Link></div>
    {top.length === 0 ? <p className="text-xs text-emerald-300">Tidak ada temuan yang perlu ditindaklanjuti saat ini.</p> : <div className="grid md:grid-cols-3 gap-2">{top.map(i => <Link to="/analisis" key={i.id} className="topcard block" style={{ borderLeft: `3px solid ${SEV_COLOR[i.sev]}` }}><div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: SEV_COLOR[i.sev] }}>{i.kat}</div><div className="text-[12.5px] font-semibold mt-0.5">{i.judul}</div><div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{i.solusi}</div></Link>)}</div>}</section>
}
