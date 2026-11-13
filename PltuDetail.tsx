import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Factory, ArrowLeft, LayoutList, Ship, GanttChartSquare, Pickaxe } from 'lucide-react'
import { useStore } from '../store'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import Gantt from '../components/Gantt'
import { STATUSES, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
import { todayRef } from '../domain/insight'

const cols: Col[] = [{ key: 'id', label: 'ID Shipment' }, { key: 'mitraTambang', label: 'Mitra Tambang' }, { key: 'mitraTransport', label: 'Mitra Transport' }, { key: 'kapal', label: 'Kapal / Tongkang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: v => stageLabel(v ?? '') }]
type Tab = 'ringkas' | 'shipment' | 'gantt' | 'sumber'
export default function PltuDetail() {
  const { nama = '' } = useParams(); const nav = useNavigate(); const { kinds, monthly, asOf } = useStore(); const [tab, setTab] = useState<Tab>('ringkas')
  const name = decodeURIComponent(nama); const r: any = kinds.plant?.rows.find(x => x.pltu === name)
  if (!kinds.plant) return <Empty />
  if (!r) return <Card><p className="text-xs">PLTU “{name}” tidak ditemukan pada data ini.</p><button className="pbtn mt-3" onClick={() => nav('/pltu')}><ArrowLeft size={14} />Kembali ke daftar PLTU</button></Card>
  const p = pct(plantActual(r), kebutuhan(r)); const rc = REGION_COLOR[r.wilayah] ?? '#22d3ee'; const SK = STATUSES.filter(s => s.key !== 'carryOver')
  const ships = (kinds.shipment?.rows ?? []).filter((s: any) => s.pltu === name); const gs = monthly?.ships.filter(x => x.plant === name) ?? []
  const sumber = new Map<string, { n: number; v: number }>(); for (const s of ships as any[]) { const k = s.mitraTambang ?? '—'; const o = sumber.get(k) ?? { n: 0, v: 0 }; o.n++; o.v += s.volume ?? 0; sumber.set(k, o) }
  const tot = SK.reduce((a, s) => a + (r[s.key] ?? 0), 0) || 1
  const TABS: [Tab, string, any, number | null][] = [['ringkas', 'Ringkasan', LayoutList, null], ['shipment', 'Shipment', Ship, ships.length], ['gantt', 'Gantt', GanttChartSquare, gs.length], ['sumber', 'Sumber tambang', Pickaxe, sumber.size]]
  return <>
    <PageHead icon={Factory} color={rc} title={name} sub={`${r.wilayah ?? 'Tanpa wilayah'} · ${r.n} shipment`} right={<button className="pbtn" onClick={() => nav(-1)}><ArrowLeft size={14} />Kembali</button>} />
    <button className="pbtn mb-3 sm:hidden" onClick={() => nav(-1)}><ArrowLeft size={14} />Kembali</button>
    <div className="dtabs" role="tablist">{TABS.map(([k, l, I, n]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><I size={15} />{l}{n != null && <em className="tabn">{n}</em>}</button>)}</div>
    {tab === 'ringkas' && <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3"><Kpi label="Konfirmasi" value={fmtNum(r.target)} unit="MT" accent="#e6b457" /><Kpi label="Carry Over" value={fmtNum(r.carryOver)} unit="MT" accent="#fb7185" /><Kpi label="Kebutuhan" value={fmtNum(kebutuhan(r))} unit="MT" accent="#a78bfa" /><Kpi label="Complete Unloading" value={fmtNum(r.ds)} unit="MT" accent="#34d399" /><Kpi label="Pemenuhan" value={fmtPct(p)} accent={tone(p)} /></div>
      <Card title="Komposisi tahapan"><div className="sbar" style={{ height: 14 }}>{SK.map(s => <i key={s.key} data-tip={`${s.label}: ${fmtNum(r[s.key])} MT`} style={{ width: `${(r[s.key] ?? 0) / tot * 100}%`, background: s.color }} />)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">{SK.filter(s => (r[s.key] ?? 0) > 0).map(s => <button key={s.key} className="stg" onClick={() => setTab('shipment')} data-tip="Lihat shipment"><i style={{ background: s.color }} /><span>{s.label}</span><b className="num">{fmtNum(r[s.key])}</b></button>)}</div></Card></>}
    {tab === 'shipment' && <Card title={`Shipment ke ${name} (${ships.length})`}><DataTable rows={ships} cols={cols} name={'shipment-' + name.toLowerCase().replace(/\W+/g, '-')} /></Card>}
    {tab === 'gantt' && (gs.length ? <Card title={`Gantt ${name}`}><Gantt ships={gs} today={asOf ? Date.parse(asOf) : todayRef()} group={false} maxH={420} /></Card> : <Card><p className="text-xs">Belum ada jadwal shipment untuk Gantt PLTU ini.</p></Card>)}
    {tab === 'sumber' && <Card title="Sumber tambang yang memasok"><div className="grid gap-2">{[...sumber].sort((a, b) => b[1].v - a[1].v).map(([k, o]) => <div key={k} className="srow"><span className="truncate">{k}</span><span className="text-slate-400 text-[11px]">{o.n} shipment</span><b className="num">{fmtNum(o.v)} MT</b></div>)}{sumber.size === 0 && <p className="text-xs">Belum ada data sumber.</p>}</div></Card>}
  </>
}
