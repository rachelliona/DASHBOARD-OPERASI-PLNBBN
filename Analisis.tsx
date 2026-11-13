import { useMemo, useState } from 'react'
import { Brain, Clock, Anchor, Ship as ShipIc, ChevronDown, Lightbulb } from 'lucide-react'
import { Card, Empty, PageHead } from '../components/ui'
import { useBulan, useCmp } from './useBulan'
import { useStore } from '../store'
import { SEV_COLOR, buildInsights, todayRef, Insight } from '../domain/insight'
import { fmtNum } from '../domain/format'
import { REGIONS } from '../domain/status'
import { regionOf } from '../domain/monthly'
type G = 'telat' | 'muat' | 'antre'
const GR: { k: G; t: string; s: string; icon: any; c: string }[] = [
  { k: 'telat', t: 'Keterlambatan shipment', s: 'Lewat ETA Rakor atau pelayaran tertahan', icon: Clock, c: '#fb7185' },
  { k: 'muat', t: 'Lama pemuatan', s: 'Sandar, mulai muat, dan selesai muat lebih lama dari biasanya', icon: ShipIc, c: '#f59e0b' },
  { k: 'antre', t: 'Tiba & bongkar', s: 'Tiba tapi belum bongkar, atau bongkar lebih lama dari biasanya', icon: Anchor, c: '#a78bfa' }]
const f1 = (n: number) => fmtNum(Math.round(n * 10) / 10, 1)
export default function Analisis() {
  const { asOf, all } = useStore(); const { b, bar, md, bulanIdx } = useBulan(); const [g, setG] = useState<G>('telat'); const [reg, setReg] = useState(''); const [lim, setLim] = useState(10); const [open, setOpen] = useState<string | null>(null)
  const { cmp, ui: cmpUi } = useCmp(); const ref = asOf ? Date.parse(asOf) : todayRef()
  const out = useMemo(() => md ? buildInsights({ ships: md.ships, ref, bulanIdx, base: all?.ships, cmp }) : null, [md, ref, bulanIdx, all, cmp])
  if (!md || !out) return <>{bar}<Empty /></>
  const kapal = new Map(md.ships.map(s => [s.id, s.tbbg.split(';')[0].trim() || (s.si ? 'SI ' + s.si : '')]))
  const inReg = (i: Insight) => !reg || (i.pltu && regionOf(i.pltu) === reg)
  const by = (k: G) => out.list.filter(i => i.grp === k && inReg(i))
  const vis = by(g); const cur = GR.find(x => x.k === g)!
  const info = (k: G) => { const l = by(k); const mx = Math.max(0, ...l.filter(i => !i.id.startsWith('q-')).map(i => i.hari ?? 0)); return { n: l.length, tinggi: l.filter(i => i.sev === 'tinggi').length, mx } }
  const chip = (i: Insight) => i.id.startsWith('q-') ? `${i.hari} kapal` : i.hari != null ? (i.id.startsWith('eta-') ? '+' : '') + f1(i.hari) + ' hari' : ''
  return <>
    <PageHead icon={Brain} color="#a78bfa" title="Analisis" month={b} sub="Per shipment: telat dari ETA, lama muat, tiba tapi belum bongkar, dan lama bongkar — lengkap dengan dugaan penyebab dan tindak lanjut." />
    {bar}
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print">{cmpUi}<select aria-label="Wilayah" value={reg} onChange={e => { setReg(e.target.value); setLim(10) }}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
    <div className="an-tabs">{GR.map(x => { const i = info(x.k); const Ic = x.icon; return <button key={x.k} className={'an-tab' + (g === x.k ? ' on' : '')} style={{ ['--c' as any]: x.c }} onClick={() => { setG(x.k); setLim(10); setOpen(null) }}>
      <Ic size={18} /><span className="an-n">{i.n}</span><span className="an-l">{x.t}</span><span className="an-s">{i.n === 0 ? 'Tidak ada' : `${i.tinggi} prioritas tinggi${i.mx ? ` · terlama ${f1(i.mx)} hari` : ''}`}</span></button> })}</div>
    <Card title={cur.t} right={<span className="text-[11px] opacity-60">{cur.s}</span>}>
      {vis.length === 0 ? <p className="text-xs text-emerald-300">Tidak ada temuan pada kategori ini.</p> : <div className="an-list">{vis.slice(0, lim).map(i => { const o = open === i.id
        return <div key={i.id} className={'an-row' + (o ? ' on' : '')} style={{ ['--c' as any]: SEV_COLOR[i.sev] }}>
          <button className="an-head" onClick={() => setOpen(o ? null : i.id)} aria-expanded={o}>
            <span className="an-main"><b>{i.pltu ?? '—'}</b>{kapal.get(i.ship ?? '') ? <span className="an-v"> · {kapal.get(i.ship ?? '')}</span> : null}<span className="an-j">{i.judul}</span></span>
            {chip(i) && <span className="an-chip">{chip(i)}</span>}<ChevronDown size={15} className="an-chev" /></button>
          {o && <div className="an-body"><p>{i.detail}</p><p className="an-sol"><Lightbulb size={13} /><span><b>Tindak lanjut:</b> {i.solusi}</span></p></div>}</div> })}</div>}
      {vis.length > lim && <button className="btn rounded-lg px-3 py-1 text-xs mt-3" onClick={() => setLim(lim + 20)}>Tampilkan lebih banyak ({vis.length - lim})</button>}
      <p className="text-[10px] text-slate-500 mt-3">Dugaan dari tanggal milestone dan catatan sheet, bukan penyebab terkonfirmasi. "Terlalu lama" = melewati P75 durasi tahap itu pada seluruh shipment; toleransi ETA 1 hari.</p></Card>
  </>
}
