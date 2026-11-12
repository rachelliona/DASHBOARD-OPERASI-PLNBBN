import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Presentation } from 'lucide-react'
import { BULAN } from '../domain/monthly'
import { sum } from '../domain/kpi'
import { fmtUpdate, sumberText, ytdFromGrid, csvGrid } from '../domain/view'
import { useStore } from '../store'
import { SOURCES } from '../config/sources'
import { buildDeck } from '../report/deck'
import { toSvg, type Assets } from '../report/scene'
import { downloadPdf, downloadPpt, loadAssets } from '../report/export'
import { loadKpi } from '../report/kpi'
const ACTIVE = ['loading', 'sailing', 'tiba', 'bongkar']
export default function LaporanSlide({ b, ds, sh, months }: { b: string; ds: any; sh: any[]; months: Record<string, any> }) {
  const { asOf } = useStore(); const [sheetYtd, setSheetYtd] = useState<ReturnType<typeof ytdFromGrid>>(null)
  useEffect(() => { if (asOf) { setSheetYtd(null); return } const u = SOURCES.find(x => x.name === 'Dashboard 1')?.url; if (!u) return; let alive = true; const c = new AbortController()
    const load = () => fetch(u + (u.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store', signal: c.signal }).then(r => r.ok ? r.text() : Promise.reject()).then(t => { if (alive) setSheetYtd(ytdFromGrid(csvGrid(t))) }).catch(() => { /* pertahankan angka terakhir */ }); load(); const t = setInterval(load, 60000); return () => { alive = false; clearInterval(t); c.abort() } }, [asOf])
  const [a, setA] = useState<Assets | null>(null); const [i, setI] = useState(0); const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  useEffect(() => { loadAssets().then(setA).catch(e => setErr(String(e.message ?? e))) }, [])
  const slides = useMemo(() => {
    const plants = ds.rows.map((r: any) => ({ ...r, __sumber: sumberText(sh.filter(x => x.pltu === r.pltu && ACTIVE.includes(x.status))) }))
    const ms = (x: string) => months[x] && !months[x].missing?.length ? months[x].ships as any[] : null
    let ytdBl = 0, ytdDs = 0, cum = 0, stop = false; const complete = BULAN.slice(0, BULAN.indexOf(b) + 1).every(x => !!ms(x)); const real: (number | null)[] = BULAN.map(x => { const s = ms(x); if (!s || stop) { stop = true; return null } const d = s.reduce((t, k) => t + (k.ds ?? 0), 0); ytdBl += s.reduce((t, k) => t + (k.bl ?? 0), 0); ytdDs += d; cum += d; return cum / 1e6 })
    return buildDeck({ bulan: b, updateTxt: fmtUpdate(ds.at), plants, ships: sh, month: sheetYtd?.month && sheetYtd.month.bulan === b.toLowerCase() ? { carry: sheetYtd.month.carry, konf: sheetYtd.month.konf, bl: sheetYtd.month.bl, ds: sheetYtd.month.ds } : { carry: sum(ds.rows, 'carryOver'), konf: sum(ds.rows, 'target'), bl: sum(ds.rows, 'bl'), ds: sum(ds.rows, 'ds') }, ytd: { bl: sheetYtd?.bl ?? (complete ? ytdBl : null), ds: sheetYtd?.ds ?? (complete ? ytdDs : null), blPct: sheetYtd?.blPct ?? null, dsPct: sheetYtd?.dsPct ?? null }, real, activeIdx: BULAN.indexOf(b), kpi: loadKpi() })
  }, [b, ds, sh, months, a, sheetYtd])
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
