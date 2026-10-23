import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import { Bar, Card, Empty } from '../components/ui'
import { STATUSES, REGIONS, norm, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
const MODES = { wilayah: 'Wilayah', pemenuhan: 'Pemenuhan', status: 'Status dominan' }
export default function Peta() {
  const { kinds } = useStore(); const plants = kinds.plant?.rows ?? [], ships = kinds.shipment?.rows ?? [], lok = kinds.lokasi?.rows ?? []
  const [reg, setReg] = useState(''); const [mode, setMode] = useState<keyof typeof MODES>('wilayah'); const [on, setOn] = useState<string[]>(STATUSES.map(s => s.key)); const [only, setOnly] = useState(true); const [sel, setSel] = useState('')
  const loc = useMemo(() => new Map(lok.map(l => [norm(l.nama), l])), [lok])
  if (!plants.length) return <Empty />
  const rows = plants.filter(p => (!reg || p.wilayah === reg) && (!only || p.n > 0)).map(p => {
    const sh = ships.filter(s => s.pltu === p.pltu && on.includes(s.status ?? '')); const vol: Record<string, number> = {}; sh.forEach(s => { vol[s.status] = (vol[s.status] ?? 0) + (s.volume ?? 0) })
    return { ...p, sh, v: sh.reduce((a, s) => a + (s.volume ?? 0), 0), dom: Object.entries(vol).sort((a, b) => b[1] - a[1])[0]?.[0], pp: pct(plantActual(p), kebutuhan(p)), l: loc.get(norm(p.pltu)) } as Record<string, any>
  })
  const color = (r: any) => !r.v ? '#6b7280' : mode === 'wilayah' ? REGION_COLOR[r.wilayah] ?? '#9ca3af' : mode === 'pemenuhan' ? tone(r.pp) : STATUSES.find(s => s.key === r.dom)?.color ?? '#9ca3af'
  const located = rows.filter(r => r.l), unlocated = rows.filter(r => !r.l); const cur = rows.find(r => r.pltu === sel)
  const legend = mode === 'wilayah' ? REGIONS.map(r => [r, REGION_COLOR[r]]) : mode === 'pemenuhan' ? [['≥ 85%', '#34d399'], ['60–85%', '#fbbf24'], ['< 60%', '#fb7185'], ['tanpa data', '#6b7280']] : STATUSES.filter(s => s.key !== 'carryOver').map(s => [s.label, s.color])
  const toggle = (k: string) => setOn(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  return <>
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
      <select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <span className="text-slate-400">Warna:</span>{(Object.keys(MODES) as (keyof typeof MODES)[]).map(m => <button key={m} onClick={() => setMode(m)} className={'rounded-full border px-2.5 py-0.5 ' + (mode === m ? 'bg-white/10 border-[#e6b457] text-[#e6b457]' : 'border-white/20')}>{MODES[m]}</button>)}
      <label><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} /> hanya PLTU bershipment</label></div>
    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">{STATUSES.filter(s => s.key !== 'carryOver').map(s => <label key={s.key}><input type="checkbox" checked={on.includes(s.key)} onChange={() => toggle(s.key)} /> <span style={{ color: s.color }}>■</span> {s.label}</label>)}</div>
    <div className="grid lg:grid-cols-[1fr_300px] gap-3"><div>
      <div style={{ height: 540 }} className="rounded-xl overflow-hidden border border-white/10"><MapContainer bounds={[[-11.5, 94], [6.5, 141.5]]} className="dark-tiles" style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {located.map(r => <CircleMarker key={r.pltu} center={[r.l.lat, r.l.lon]} radius={r.v ? Math.max(5, Math.min(22, 5 + Math.sqrt(r.v) / 12)) : 4} pathOptions={{ color: sel === r.pltu ? '#fff' : color(r), weight: sel === r.pltu ? 3 : 1.5, fillColor: color(r), fillOpacity: r.v ? 0.55 : 0.25 }} eventHandlers={{ click: () => setSel(r.pltu) }}>
          <Tooltip>{r.pltu} · {fmtPct(r.pp)} · {r.sh.length} shipment</Tooltip></CircleMarker>)}</MapContainer></div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">{legend.map(([l, c]) => <span key={l}><span style={{ color: c }}>●</span> {l}</span>)}<span className="text-slate-500">· ukuran lingkaran = volume · basemap OpenStreetMap · tidak ada posisi kapal waktu nyata dan rute belum digambar (koordinat jetty belum tersedia)</span></div></div>
    <div><Card title="Panel Detail">{!cur ? <p className="text-xs text-slate-400">Klik lingkaran PLTU pada peta.</p> : <div className="text-xs"><b className="text-sm">{cur.pltu}</b><div style={{ color: REGION_COLOR[cur.wilayah] }}>{cur.wilayah ?? 'Tanpa wilayah'}</div>
      <div className="mt-2 flex justify-between"><span>Pemenuhan</span><b style={{ color: tone(cur.pp) }}>{fmtPct(cur.pp)}</b></div><Bar pct={cur.pp} color={tone(cur.pp)} />
      <div className="mt-1 text-slate-400">Kebutuhan {fmtNum(kebutuhan(cur))} · D/S {fmtNum(cur.ds)} MT</div>
      <div className="flex h-2 rounded overflow-hidden my-2 bg-white/5">{STATUSES.filter(s => s.key !== 'carryOver').map(s => <div key={s.key} title={`${s.label}: ${fmtNum(cur[s.key])} MT`} style={{ flex: cur[s.key] || 0, background: s.color }} />)}</div>
      <div className="max-h-56 overflow-auto">{cur.sh.map((s: any, i: number) => <div key={i} className="border-t border-white/5 py-1"><span style={{ color: STATUSES.find(x => x.key === s.status)?.color }}>●</span> {stageLabel(s.status)} · {fmtNum(s.volume)} MT<div className="text-[11px] text-slate-400 truncate">{s.mitra ?? '—'} · {s.kapal ?? s.id}</div></div>)}</div></div>}</Card>
      <Card title={`PLTU Tanpa Koordinat (${unlocated.length})`}><ul className="text-xs max-h-40 overflow-auto">{unlocated.map(r => <li key={r.pltu}>{r.pltu}</li>)}</ul></Card></div></div>
  </>
}
