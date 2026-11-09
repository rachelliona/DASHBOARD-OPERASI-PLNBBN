import { useMemo, useState } from 'react'
import { GanttChart } from 'lucide-react'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import Gantt from '../components/Gantt'
import AnalisisBox from '../components/AnalisisBox'
import { useBulan, useCmp } from './useBulan'
import { Ship, regionOf, stepDays } from '../domain/monthly'
import { REGIONS, STATUSES, stageLabel } from '../domain/status'
import { buildInsights, SEV_COLOR, CMP_SHORT, todayRef } from '../domain/insight'
import { analisis } from '../domain/sebab'
import { useStore } from '../store'
import { fmtNum } from '../domain/format'
export default function GanttPage() {
  const { asOf, all } = useStore(); const { b, bar, md, bulanIdx } = useBulan(); const [reg, setReg] = useState(''); const [st, setSt] = useState(''); const [bad, setBad] = useState(false); const [sel, setSel] = useState<Ship | null>(null)
  const { cmp, ui: cmpUi } = useCmp(); const ref = asOf ? Date.parse(asOf) : todayRef()
  const out = useMemo(() => md ? buildInsights({ ships: md.ships, ref, bulanIdx, base: all?.ships, cmp }) : null, [md, ref, bulanIdx, all, cmp])
  const flags = useMemo(() => { const m = new Map<string, 'tinggi' | 'sedang' | 'rendah'>(); out?.list.forEach(i => { if (i.ship && (!m.has(i.ship) || i.sev === 'tinggi')) m.set(i.ship, i.sev) }); return m }, [out])
  if (!md || !out) return <>{bar}<Empty /></>
  const ships = md.ships.filter(s => (!reg || regionOf(s.plant) === reg) && (!st || s.stage === st) && (!bad || flags.has(s.id)))
  const e = out.etaPol; const an = sel ? analisis(sel.ms, stepDays(sel.ms), out.stats, sel.note ?? '', ref, null) : null; const mine = sel ? out.list.filter(i => i.ship === sel.id) : []
  return <>
    <PageHead icon={GanttChart} color="#6366f1" title="Gantt Pasokan" sub={<>Garis waktu tiap shipment dari SI sampai selesai bongkar · ◆ = ETA (kolom Tgl.) · garis merah di bawah ◆ = ETA terlewati (belum/terlambat tercatat) · klik batang untuk analisis</>} />
    {bar}
    <div className="mb-3">{cmpUi}</div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3"><Kpi label={`Shipment ${b}`} value={fmtNum(md.ships.length)} accent="#6366f1" /><Kpi label={`ETA ${CMP_SHORT[cmp]} tepat waktu`} value={fmtNum(e.tepat + e.cepat)} note={`dari ${fmtNum(e.tepat + e.cepat + e.telat)} yang sudah bertanggal ${CMP_SHORT[cmp]}`} accent="#34d399" />
      <Kpi label={`ETA ${CMP_SHORT[cmp]} telat`} value={fmtNum(e.telat)} note={e.rata == null ? undefined : `rata-rata +${fmtNum(e.rata, 1)} hari`} accent="#fb7185" /><Kpi label="Lewat ETA, belum tercatat" value={fmtNum(e.belum)} accent="#fbbf24" /><Kpi label="Temuan perlu tindak lanjut" value={fmtNum(out.ringkas.tinggi + out.ringkas.sedang)} note={`${out.ringkas.tinggi} prioritas tinggi`} accent="#a78bfa" /></div>
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print"><select aria-label="Wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <select aria-label="Status" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{STATUSES.filter(s => s.key !== 'carryOver').map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      <label><input type="checkbox" checked={bad} onChange={e => setBad(e.target.checked)} /> hanya shipment bermasalah ({flags.size})</label><span className="text-slate-500">{ships.length} shipment</span></div>
    <Card><Gantt ships={ships} today={ref} cmp={cmp} onSelect={setSel} selId={sel?.id} flags={flags} /></Card>
    {sel && <Card title={`${sel.plant} · ${sel.tbbg.split(';')[0] || sel.id}`} right={<button className="text-xs text-[#e6b457]" onClick={() => setSel(null)}>Tutup</button>}>
      <p className="text-xs text-slate-300 mb-2">Status {stageLabel(sel.stage)} · SI {sel.si || '—'} · {sel.mitraReal || 'mitra —'} · volume {fmtNum(sel.vol)} MT</p>
      {mine.length ? <div className="grid gap-2 mb-2">{mine.map(i => <div key={i.id} className="hl" style={{ ['--hc' as any]: SEV_COLOR[i.sev] }}><div className="hl-t">{i.judul}</div><p>{i.detail}</p><p className="mt-1"><b>Solusi:</b> {i.solusi}</p></div>)}</div> : <p className="text-xs text-emerald-300 mb-2">Tidak ada temuan untuk shipment ini.</p>}
      {an && (an.slow.length > 0 || an.running) && <AnalisisBox a={an} />}</Card>}
  </>
}
