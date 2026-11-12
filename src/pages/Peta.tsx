import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../theme'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import { Bar, Card, Empty, PageHead } from '../components/ui'
import { STATUSES, REGIONS, norm, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
import { BULAN, aggregateYtd } from '../domain/monthly'
import { Box, Grid2x2, Map as MapIc, Waves, Info, Trophy, Layers, RotateCcw } from 'lucide-react'
import { useDetail } from '../components/Detail'
import Map3D from '../components/map/Map3D'
import FlowLanes from '../components/map/FlowLanes'
import RegionView from '../components/map/RegionView'
type VW = 'd3' | 'jalur' | 'region' | 'klasik'
const VIEWS: [VW, string, any][] = [['d3', 'Peta 3D', Box], ['jalur', 'Jalur Laut–Darat', Waves], ['region', 'Per Region', Grid2x2], ['klasik', 'Peta Klasik', MapIc]]
const MODES: Record<string, string> = { wilayah: 'Wilayah', pemenuhan: 'Pemenuhan', status: 'Status dominan' }
export default function Peta() {
  const th = useTheme(); const dt = useDetail()
  const { kinds, all, raw, status, fetchSheet, asOf } = useStore(); const plants = kinds.plant?.rows ?? [], ships = kinds.shipment?.rows ?? [], lok = kinds.lokasi?.rows ?? []
  const [view, setView] = useState<'existing' | 'rekap'>('existing'); const [reg, setReg] = useState(''); const [mode, setMode] = useState('wilayah'); const [on, setOn] = useState<string[]>(STATUSES.map(s => s.key)); const [only, setOnly] = useState(true); const [sel, setSel] = useState(''); const [vw, setVw] = useState<VW>('d3')
  useEffect(() => { if (!asOf && view === 'rekap' && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [view, asOf])
  const ytd = useMemo(() => all ? aggregateYtd(all.ships) : null, [all])
  const loc = useMemo(() => new Map(lok.map(l => [norm(l.nama), l])), [lok])
  if (!plants.length && view === 'existing') return <Empty />
  const m = view === 'rekap' && mode === 'status' ? 'wilayah' : mode
  const rows: any[] = view === 'rekap' ? (ytd ?? []).filter(p => (!reg || p.wilayah === reg) && (!only || p.n > 0)).map(p => ({ ...p, act: p.ds, v: p.ds, pp: p.p, sh: [] as any[], l: loc.get(norm(p.pltu)) })) : plants.filter(p => (!reg || p.wilayah === reg) && (!only || p.n > 0)).map(p => {
    const sh = ships.filter(s => s.pltu === p.pltu && on.includes(s.status ?? '')); const vol: Record<string, number> = {}; sh.forEach(s => { vol[s.status] = (vol[s.status] ?? 0) + (s.volume ?? 0) })
    return { ...p, keb: kebutuhan(p), act: plantActual(p), sh, v: sh.reduce((a, s) => a + (s.volume ?? 0), 0), dom: Object.entries(vol).sort((a, b) => b[1] - a[1])[0]?.[0], pp: pct(plantActual(p), kebutuhan(p)), l: loc.get(norm(p.pltu)) } as Record<string, any>
  }) as any[]
  const color = (r: any) => !r.v ? '#6b7280' : m === 'wilayah' ? REGION_COLOR[r.wilayah] ?? '#9ca3af' : m === 'pemenuhan' ? tone(r.pp) : STATUSES.find(s => s.key === r.dom)?.color ?? '#9ca3af'
  const located = rows.filter(r => r.l), unlocated = rows.filter(r => !r.l); const cur = rows.find(r => r.pltu === sel)
  const legend = m === 'wilayah' ? REGIONS.map(r => [r, REGION_COLOR[r]]) : m === 'pemenuhan' ? [['≥ 100%', '#86efac'], ['85–100%', '#34d399'], ['60–85%', '#2dd4bf'], ['30–60%', '#22d3ee'], ['< 30%', '#60a5fa'], ['tanpa data', '#6b7280']] : STATUSES.filter(s => s.key !== 'carryOver').map(s => [s.label, s.color])
  const pick = (p: string) => { setSel(p); const r = rows.find(x => x.pltu === p); if (r) dt.open({ title: r.pltu, sub: `${r.wilayah ?? 'Tanpa wilayah'} · ${view === 'rekap' ? 'rekap tahun berjalan' : 'shipment berjalan'}`, color: REGION_COLOR[r.wilayah] ?? '#e6b457', stats: [{ l: 'Pemenuhan', v: fmtPct(r.pp), c: tone(r.pp) }, { l: 'Kebutuhan', v: fmtNum(view === 'rekap' ? r.keb : kebutuhan(r)) + ' MT' }, { l: 'Unloading (D/S)', v: fmtNum(r.ds) + ' MT' }, { l: 'Shipment', v: String(view === 'rekap' ? r.n : r.sh.length) }], table: view === 'rekap' ? undefined : { head: ['Tahap', 'Shipment', 'Mitra', 'Volume (MT)'], rows: r.sh.slice(0, 12).map((x: any) => [stageLabel(x.status), x.kapal ?? x.id, x.mitra ?? '—', fmtNum(x.volume)]), align: ['l', 'l', 'l', 'r'] }, actions: [{ label: 'Buka halaman PLTU', to: '/pltu/' + encodeURIComponent(r.pltu) }, { label: 'Lihat di Gantt', to: '/gantt' }, { label: 'Lihat shipment', to: '/shipment?q=' + encodeURIComponent(r.pltu) }] }); if (window.innerWidth < 1024) setTimeout(() => document.getElementById('panel-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }
  const pw = new Map(plants.map(p => [p.pltu, p.wilayah])); const flowShips = ships.filter(x => on.includes(x.status ?? '')).map(x => ({ ...x, wilayah: x.wilayah ?? pw.get(x.pltu) }))
  const toggle = (k: string) => setOn(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  return <>
    <PageHead title="Peta Shipment" sub="Sebaran pasokan batubara ke PLTU. Klik PLTU untuk detail, ganti tampilan peta di bawah." />
    <div className="vsw mb-3" role="tablist" aria-label="Pilih tampilan peta">{VIEWS.map(([k, l, I]) => <button key={k} role="tab" aria-selected={vw === k} onClick={() => setVw(k)} className={'vsw-b' + (vw === k ? ' on' : '')}><I size={16} /><span>{l}</span></button>)}</div>
    <div className="flex gap-2 mb-2">{([['existing', 'Shipment Berjalan'], ['rekap', 'Rekap Tahun Berjalan']] as const).map(([k, l]) => <button key={k} onClick={() => { setView(k); setSel('') }} className={'fchip' + (view === k ? ' on' : '')} style={{ ['--c' as any]: '#e6b457' }}>{l}</button>)}</div>
    {view === 'rekap' && !all && <p className="text-xs text-slate-400 mb-2">{status['ALL Shipment']?.state === 'Gagal Diakses' ? 'Gagal Mengambil Data ALL Shipment.' : 'Memuat Data… (sheet ALL Shipment cukup besar)'}</p>}
    <div className="ptool">
      <div className="ptool-g"><span className="ptool-l">Wilayah</span><select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
      <div className="ptool-g"><span className="ptool-l">Warna</span><div className="seg">{Object.keys(MODES).filter(k => view === 'existing' || k !== 'status').map(k => <button key={k} onClick={() => setMode(k)} className={m === k ? 'on' : ''}>{MODES[k]}</button>)}</div></div>
      <button className={'fchip' + (only ? ' on' : '')} style={{ ['--c' as any]: '#94a3b8' }} aria-pressed={only} onClick={() => setOnly(!only)}>Hanya PLTU bershipment</button>
      <span className="ptool-sp" />
      <button className="pbtn" onClick={() => { const top = [...rows].filter(r => r.v).sort((a, b) => b.v - a.v).slice(0, 12); dt.open({ title: 'Peringkat PLTU berdasarkan volume', sub: view === 'rekap' ? 'Rekap tahun berjalan' : 'Shipment berjalan sesuai tahap terpilih', color: '#e6b457', icon: Trophy, table: { head: ['#', 'PLTU', 'Wilayah', 'Volume (MT)', 'Pemenuhan'], rows: top.map((r, i) => [i + 1, r.pltu, r.wilayah ?? '—', fmtNum(r.v), fmtPct(r.pp)]), align: ['r', 'l', 'l', 'r', 'r'] }, actions: [{ label: 'Buka dashboard interaktif', to: '/dashboard' }] }) }}><Trophy size={14} />Peringkat PLTU</button>
      <button className="pbtn" onClick={() => dt.open({ title: 'Ringkasan per wilayah', color: '#38bdf8', icon: Layers, table: { head: ['Wilayah', 'PLTU', 'Shipment', 'Volume (MT)'], rows: REGIONS.map(g => { const x = rows.filter(r => r.wilayah === g); return [g, x.length, x.reduce((a, r) => a + (view === 'rekap' ? r.n : r.sh.length), 0), fmtNum(x.reduce((a, r) => a + (r.v ?? 0), 0))] }), align: ['l', 'r', 'r', 'r'] } })}><Layers size={14} />Per wilayah</button>
      <button className="pbtn" onClick={() => dt.open({ title: 'Catatan peta', color: '#94a3b8', icon: Info, body: <ul className="dlg-notes"><li>Tinggi balok = volume shipment pada tahap terpilih.</li><li>Kapal digambar ilustratif menuju PLTU, bukan posisi GPS nyata.</li><li>Peta Jalur hanya memakai shipment berjalan; mode Rekap tidak berlaku.</li><li>Peta Klasik memakai basemap OpenStreetMap; tidak ada posisi kapal waktu nyata.</li><li>PLTU tanpa koordinat tercantum di panel samping.</li></ul> })}><Info size={14} />Catatan</button></div>
    {view === 'existing' && <div className="pstage" role="group" aria-label="Tahap shipment yang ditampilkan"><span className="ptool-l">Tahap</span>{STATUSES.filter(s => s.key !== 'carryOver').map(s => { const n = ships.filter(x => x.status === s.key && (!reg || x.wilayah === reg)).length; return <button key={s.key} aria-pressed={on.includes(s.key)} className={'fchip' + (on.includes(s.key) ? ' on' : '')} style={{ ['--c' as any]: s.color }} onClick={() => toggle(s.key)}>{s.label}<b>{n}</b></button> })}
      <button className="pbtn ghost" onClick={() => setOn(on.length === STATUSES.length - 1 ? [] : STATUSES.filter(s => s.key !== 'carryOver').map(s => s.key))}><RotateCcw size={13} />{on.length >= STATUSES.length - 1 ? 'Kosongkan' : 'Pilih semua'}</button></div>}
    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-3"><div className="min-w-0">
      {vw === 'd3' && <Map3D rows={rows} color={color} sel={sel} onSel={pick} showShips={view === 'existing'} reg={reg} />}
      {vw === 'jalur' && <FlowLanes ships={flowShips} reg={reg} sel={sel} onSel={pick} />}
      {vw === 'region' && <RegionView rows={rows} color={color} sel={sel} onSel={pick} onFocus={r => { setReg(r); setVw('d3') }} />}
      {vw === 'klasik' &&       <div className="h-[62vh] min-h-[360px] md:h-[540px] rounded-xl overflow-hidden border border-white/10"><MapContainer bounds={[[-11.5, 94], [6.5, 141.5]]} className={th === 'dark' ? 'dark-tiles' : ''} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {located.map(r => <CircleMarker key={r.pltu} center={[r.l.lat, r.l.lon]} radius={r.v ? Math.max(5, Math.min(22, 5 + Math.sqrt(r.v) / (view === 'rekap' ? 30 : 12))) : 4} pathOptions={{ color: sel === r.pltu ? '#fff' : color(r), weight: sel === r.pltu ? 3 : 1.5, fillColor: color(r), fillOpacity: r.v ? 0.55 : 0.25 }} eventHandlers={{ click: () => { setSel(r.pltu); if (window.innerWidth < 1024) setTimeout(() => document.getElementById('panel-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) } }}>
          <Tooltip>{r.pltu} · {fmtPct(r.pp)} · {view === 'rekap' ? r.n : r.sh.length} shipment</Tooltip></CircleMarker>)}</MapContainer></div>}
      <div className="plegend" role="list" aria-label="Legenda"><span className="plegend-t">Legenda · {MODES[m]}</span>{legend.map(([l, c]) => <span role="listitem" key={l} className="plegend-i"><i style={{ background: c }} />{l}</span>)}</div></div>
    <div><div id="panel-detail" className="scroll-mt-20"></div><Card title="Panel Detail">{!cur ? <p className="text-xs text-slate-400">Klik lingkaran PLTU pada peta.</p> : <div className="text-xs"><b className="text-sm">{cur.pltu}</b><div style={{ color: REGION_COLOR[cur.wilayah] }}>{cur.wilayah ?? 'Tanpa wilayah'}</div>
      <div className="mt-2 flex justify-between"><span>Pemenuhan</span><b style={{ color: tone(cur.pp) }}>{fmtPct(cur.pp)}</b></div><Bar pct={cur.pp} color={tone(cur.pp)} />
      <div className="mt-1 text-slate-400">Kebutuhan {fmtNum(view === 'rekap' ? cur.keb : kebutuhan(cur))} · D/S {fmtNum(cur.ds)} MT{view === 'rekap' ? ` · B/L ${fmtNum(cur.bl)} MT · ${cur.n} shipment` : ''}</div>
      {view === 'rekap' ? <div className="my-2"><div className="text-[11px] text-slate-400 mb-1">Unloading (D/S) per bulan konfirmasi</div><div className="flex items-end gap-0.5 h-16">{cur.bln.map((x: any) => <div key={x.b} title={`${x.b}: konfirmasi ${fmtNum(x.j)} · D/S ${fmtNum(x.ds)} MT`} className="flex-1 flex flex-col justify-end h-full"><div style={{ height: `${x.ds / Math.max(1, ...cur.bln.map((y: any) => y.ds)) * 100}%`, background: '#34d399' }} /></div>)}</div><div className="flex gap-0.5 text-[9px] text-slate-500">{BULAN.map(b => <span key={b} className="flex-1 text-center">{b[0]}</span>)}</div></div> : <div className="flex h-2 rounded overflow-hidden my-2 bg-white/5">{STATUSES.filter(s => s.key !== 'carryOver').map(s => <div key={s.key} title={`${s.label}: ${fmtNum(cur[s.key])} MT`} style={{ flex: cur[s.key] || 0, background: s.color }} />)}</div>}
      <div className="max-h-56 overflow-auto">{cur.sh.map((s: any, i: number) => <div key={i} className="border-t border-white/5 py-1"><span style={{ color: STATUSES.find(x => x.key === s.status)?.color }}>●</span> {stageLabel(s.status)} · {fmtNum(s.volume)} MT<div className="text-[11px] text-slate-400 truncate">{s.mitra ?? '—'} · {s.kapal ?? s.id}</div></div>)}</div></div>}</Card>
      <Card title={`PLTU Tanpa Koordinat (${unlocated.length})`}><ul className="text-xs max-h-40 overflow-auto">{unlocated.map(r => <li key={r.pltu}>{r.pltu}</li>)}</ul></Card></div></div>
  </>
}
