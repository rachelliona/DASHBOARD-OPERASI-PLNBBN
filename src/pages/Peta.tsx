import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import { Bar, Card, Empty } from '../components/ui'
import { STATUSES, REGIONS, norm, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
import { BULAN, aggregateYtd } from '../domain/monthly'
const MODES: Record<string, string> = { wilayah: 'Wilayah', pemenuhan: 'Pemenuhan', status: 'Status dominan' }
export default function Peta() {
  const { kinds, all, raw, status, fetchSheet, asOf } = useStore(); const plants = kinds.plant?.rows ?? [], ships = kinds.shipment?.rows ?? [], lok = kinds.lokasi?.rows ?? []
  const [view, setView] = useState<'existing' | 'rekap'>('existing'); const [reg, setReg] = useState(''); const [mode, setMode] = useState('wilayah'); const [on, setOn] = useState<string[]>(STATUSES.map(s => s.key)); const [only, setOnly] = useState(true); const [sel, setSel] = useState('')
  useEffect(() => { if (!asOf && view === 'rekap' && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [view, asOf])
  const ytd = useMemo(() => all ? aggregateYtd(all.ships) : null, [all])
  const loc = useMemo(() => new Map(lok.map(l => [norm(l.nama), l])), [lok])
  if (!plants.length && view === 'existing') return <Empty />
  const m = view === 'rekap' && mode === 'status' ? 'wilayah' : mode
  const rows: any[] = view === 'rekap' ? (ytd ?? []).filter(p => (!reg || p.wilayah === reg) && (!only || p.n > 0)).map(p => ({ ...p, v: p.ds, pp: p.p, sh: [] as any[], l: loc.get(norm(p.pltu)) })) : plants.filter(p => (!reg || p.wilayah === reg) && (!only || p.n > 0)).map(p => {
    const sh = ships.filter(s => s.pltu === p.pltu && on.includes(s.status ?? '')); const vol: Record<string, number> = {}; sh.forEach(s => { vol[s.status] = (vol[s.status] ?? 0) + (s.volume ?? 0) })
    return { ...p, sh, v: sh.reduce((a, s) => a + (s.volume ?? 0), 0), dom: Object.entries(vol).sort((a, b) => b[1] - a[1])[0]?.[0], pp: pct(plantActual(p), kebutuhan(p)), l: loc.get(norm(p.pltu)) } as Record<string, any>
  }) as any[]
  const color = (r: any) => !r.v ? '#6b7280' : m === 'wilayah' ? REGION_COLOR[r.wilayah] ?? '#9ca3af' : m === 'pemenuhan' ? tone(r.pp) : STATUSES.find(s => s.key === r.dom)?.color ?? '#9ca3af'
  const located = rows.filter(r => r.l), unlocated = rows.filter(r => !r.l); const cur = rows.find(r => r.pltu === sel)
  const legend = m === 'wilayah' ? REGIONS.map(r => [r, REGION_COLOR[r]]) : m === 'pemenuhan' ? [['≥ 85%', '#34d399'], ['60–85%', '#fbbf24'], ['< 60%', '#fb7185'], ['tanpa data', '#6b7280']] : STATUSES.filter(s => s.key !== 'carryOver').map(s => [s.label, s.color])
  const toggle = (k: string) => setOn(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  return <>
    <div className="flex gap-2 mb-2">{([['existing', 'Shipment Berjalan'], ['rekap', 'Rekap Tahun Berjalan']] as const).map(([k, l]) => <button key={k} onClick={() => { setView(k); setSel('') }} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#e6b457', background: view === k ? '#e6b457' : 'transparent', color: view === k ? '#15130d' : '#e6b457', fontWeight: view === k ? 600 : 400 }}>{l}</button>)}</div>
    {view === 'rekap' && !all && <p className="text-xs text-slate-400 mb-2">{status['ALL Shipment']?.state === 'Gagal Diakses' ? 'Gagal Mengambil Data ALL Shipment.' : 'Memuat Data… (sheet ALL Shipment cukup besar)'}</p>}
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
      <select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <span className="text-slate-400">Warna:</span>{Object.keys(MODES).filter(k => view === 'existing' || k !== 'status').map(k => <button key={k} onClick={() => setMode(k)} className={'rounded-full border px-2.5 py-0.5 ' + (m === k ? 'bg-white/10 border-[#e6b457] text-[#e6b457]' : 'border-white/20')}>{MODES[k]}</button>)}
      <label><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} /> hanya PLTU bershipment</label></div>
    {view === 'existing' && <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">{STATUSES.filter(s => s.key !== 'carryOver').map(s => <label key={s.key}><input type="checkbox" checked={on.includes(s.key)} onChange={() => toggle(s.key)} /> <span style={{ color: s.color }}>■</span> {s.label}</label>)}</div>}
    <div className="grid lg:grid-cols-[1fr_300px] gap-3"><div>
      <div className="h-[62vh] min-h-[360px] md:h-[540px] rounded-xl overflow-hidden border border-white/10"><MapContainer bounds={[[-11.5, 94], [6.5, 141.5]]} className="dark-tiles" style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {located.map(r => <CircleMarker key={r.pltu} center={[r.l.lat, r.l.lon]} radius={r.v ? Math.max(5, Math.min(22, 5 + Math.sqrt(r.v) / (view === 'rekap' ? 30 : 12))) : 4} pathOptions={{ color: sel === r.pltu ? '#fff' : color(r), weight: sel === r.pltu ? 3 : 1.5, fillColor: color(r), fillOpacity: r.v ? 0.55 : 0.25 }} eventHandlers={{ click: () => { setSel(r.pltu); if (window.innerWidth < 1024) setTimeout(() => document.getElementById('panel-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) } }}>
          <Tooltip>{r.pltu} · {fmtPct(r.pp)} · {view === 'rekap' ? r.n : r.sh.length} shipment</Tooltip></CircleMarker>)}</MapContainer></div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">{legend.map(([l, c]) => <span key={l}><span style={{ color: c }}>●</span> {l}</span>)}<span className="text-slate-500">· ukuran lingkaran = volume · basemap OpenStreetMap · tidak ada posisi kapal waktu nyata dan rute belum digambar (koordinat jetty belum tersedia)</span></div></div>
    <div><div id="panel-detail" className="scroll-mt-20"></div><Card title="Panel Detail">{!cur ? <p className="text-xs text-slate-400">Klik lingkaran PLTU pada peta.</p> : <div className="text-xs"><b className="text-sm">{cur.pltu}</b><div style={{ color: REGION_COLOR[cur.wilayah] }}>{cur.wilayah ?? 'Tanpa wilayah'}</div>
      <div className="mt-2 flex justify-between"><span>Pemenuhan</span><b style={{ color: tone(cur.pp) }}>{fmtPct(cur.pp)}</b></div><Bar pct={cur.pp} color={tone(cur.pp)} />
      <div className="mt-1 text-slate-400">Kebutuhan {fmtNum(view === 'rekap' ? cur.keb : kebutuhan(cur))} · D/S {fmtNum(cur.ds)} MT{view === 'rekap' ? ` · B/L ${fmtNum(cur.bl)} MT · ${cur.n} shipment` : ''}</div>
      {view === 'rekap' ? <div className="my-2"><div className="text-[11px] text-slate-400 mb-1">Unloading (D/S) per bulan konfirmasi</div><div className="flex items-end gap-0.5 h-16">{cur.bln.map((x: any) => <div key={x.b} title={`${x.b}: konfirmasi ${fmtNum(x.j)} · D/S ${fmtNum(x.ds)} MT`} className="flex-1 flex flex-col justify-end h-full"><div style={{ height: `${x.ds / Math.max(1, ...cur.bln.map((y: any) => y.ds)) * 100}%`, background: '#34d399' }} /></div>)}</div><div className="flex gap-0.5 text-[9px] text-slate-500">{BULAN.map(b => <span key={b} className="flex-1 text-center">{b[0]}</span>)}</div></div> : <div className="flex h-2 rounded overflow-hidden my-2 bg-white/5">{STATUSES.filter(s => s.key !== 'carryOver').map(s => <div key={s.key} title={`${s.label}: ${fmtNum(cur[s.key])} MT`} style={{ flex: cur[s.key] || 0, background: s.color }} />)}</div>}
      <div className="max-h-56 overflow-auto">{cur.sh.map((s: any, i: number) => <div key={i} className="border-t border-white/5 py-1"><span style={{ color: STATUSES.find(x => x.key === s.status)?.color }}>●</span> {stageLabel(s.status)} · {fmtNum(s.volume)} MT<div className="text-[11px] text-slate-400 truncate">{s.mitra ?? '—'} · {s.kapal ?? s.id}</div></div>)}</div></div>}</Card>
      <Card title={`PLTU Tanpa Koordinat (${unlocated.length})`}><ul className="text-xs max-h-40 overflow-auto">{unlocated.map(r => <li key={r.pltu}>{r.pltu}</li>)}</ul></Card></div></div>
  </>
}
