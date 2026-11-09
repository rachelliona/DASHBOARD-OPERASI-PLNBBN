import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Presentation } from 'lucide-react'
import { BULAN } from '../domain/monthly'
import { sum } from '../domain/kpi'
import { fmtUpdate, sumberText } from '../domain/view'
import { buildDeck } from '../report/deck'
import { toSvg, type Assets } from '../report/scene'
import { downloadPdf, downloadPpt, loadAssets } from '../report/export'
import { loadKpi } from '../report/kpi'
const ACTIVE = ['loading', 'sailing', 'tiba', 'bongkar']
export default function LaporanSlide({ b, ds, sh, months }: { b: string; ds: any; sh: any[]; months: Record<string, any> }) {
  const [a, setA] = useState<Assets | null>(null); const [i, setI] = useState(0); const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  useEffect(() => { loadAssets().then(setA).catch(e => setErr(String(e.message ?? e))) }, [])
  const slides = useMemo(() => {
    const plants = ds.rows.map((r: any) => ({ ...r, __sumber: sumberText(sh.filter(x => x.pltu === r.pltu && ACTIVE.includes(x.status))) }))
    const ms = (x: string) => months[x] && !months[x].missing?.length ? months[x].ships as any[] : null
    let ytdBl = 0, ytdDs = 0, cum = 0, stop = false; const real: (number | null)[] = BULAN.map(x => { const s = ms(x); if (!s || stop) { stop = true; return null } const d = s.reduce((t, k) => t + (k.ds ?? 0), 0); ytdBl += s.reduce((t, k) => t + (k.bl ?? 0), 0); ytdDs += d; cum += d; return cum / 1e6 })
    return buildDeck({ bulan: b, updateTxt: fmtUpdate(ds.at), plants, ships: sh, month: { carry: sum(ds.rows, 'carryOver'), konf: sum(ds.rows, 'target'), bl: sum(ds.rows, 'bl'), ds: sum(ds.rows, 'ds') }, ytd: { bl: ytdBl, ds: ytdDs }, real, activeIdx: BULAN.indexOf(b), kpi: loadKpi() })
  }, [b, ds, sh, months, a])
  const svgs = useMemo(() => a ? slides.map(s => toSvg(s, a)) : [], [slides, a]); const go = (d: number) => setI(v => (v + d + slides.length) % slides.length)
  const dl = async (k: 'pdf' | 'ppt') => { setBusy(k); setErr(''); try { await (k === 'pdf' ? downloadPdf : downloadPpt)(slides, b) } catch (e: any) { setErr('Gagal membuat file: ' + (e?.message ?? e)) } finally { setBusy('') } }
  return <div>
    <div className="flex flex-wrap items-center gap-2 mb-3 no-print">
      <button className="btn rounded-lg px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50" disabled={!!busy || !a} onClick={() => dl('pdf')}><FileText size={14} />{busy === 'pdf' ? 'Membuat PDF…' : 'Unduh PDF'}</button>
      <button className="btn rounded-lg px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50" disabled={!!busy || !a} onClick={() => dl('ppt')}><Presentation size={14} />{busy === 'ppt' ? 'Membuat PPT…' : 'Unduh PPT'}</button>
      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Download size={12} />8 slide · isi dan tampilan sama dengan laporan harian</span>
      <div className="ml-auto inline-flex items-center gap-1"><button aria-label="Slide sebelumnya" className="fchip" style={{ ['--c' as any]: '#94a3b8' }} onClick={() => go(-1)}><ChevronLeft size={14} /></button><span className="text-xs tabular-nums text-slate-300 px-1">{i + 1} / {slides.length}</span><button aria-label="Slide berikutnya" className="fchip" style={{ ['--c' as any]: '#94a3b8' }} onClick={() => go(1)}><ChevronRight size={14} /></button></div>
    </div>
    {err && <p className="text-xs text-rose-300 mb-2">{err}</p>}
    <div className="slide-frame" dangerouslySetInnerHTML={{ __html: svgs[i] ?? '' }} aria-label={`Slide ${i + 1}: ${slides[i]?.name}`} />
    <div className="flex gap-2 overflow-x-auto mt-3 pb-1 no-print">{slides.map((s, k) => <button key={k} onClick={() => setI(k)} className={'slide-th' + (k === i ? ' on' : '')} title={s.name}><span dangerouslySetInnerHTML={{ __html: svgs[k] ?? '' }} /><b>{k + 1}</b></button>)}</div>
  </div>
}
