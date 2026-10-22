import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import { Card, Empty } from '../components/ui'
import { STAGES, STATUSES, REGIONS, norm, stageLabel } from '../domain/status'
import { fmtNum } from '../domain/format'
export default function Peta() {
  const { kinds } = useStore(); const plants = kinds.plant?.rows ?? [], ships = kinds.shipment?.rows ?? [], lok = kinds.lokasi?.rows ?? []
  const [reg, setReg] = useState(''); const [on, setOn] = useState<string[]>(STATUSES.map(s => s.key)); const [routes, setRoutes] = useState(true); const [sel, setSel] = useState<{ t: 'pltu' | 'ship'; v: any } | null>(null)
  const loc = useMemo(() => new Map(lok.map(l => [norm(l.nama), l])), [lok])
  if (!plants.length && !ships.length) return <Empty hint="Peta memerlukan dataset PLTU/shipment dan master lokasi. Impor di" />
  const regOf = (name: string) => plants.find(p => p.pltu === name)?.wilayah ?? ships.find(s => s.pltu === name)?.wilayah
  const names = [...new Set([...plants.map(p => p.pltu), ...ships.map(s => s.pltu)])].filter(n => !reg || norm(regOf(n)) === norm(reg))
  const fs = ships.filter(s => names.includes(s.pltu) && (s.status ? on.includes(s.status) : true))
  const located = names.filter(n => loc.has(norm(n))), unlocated = names.filter(n => !loc.has(norm(n)))
  const toggle = (k: string) => setOn(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  return <>
    <div className="flex flex-wrap gap-2 mb-2 no-print"><select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <label className="text-xs"><input type="checkbox" checked={routes} onChange={e => setRoutes(e.target.checked)} /> Rute indikatif</label>
      {STATUSES.map(s => <label key={s.key} className="text-xs"><input type="checkbox" checked={on.includes(s.key)} onChange={() => toggle(s.key)} /> <span style={{ color: s.color }}>■</span> {s.label}</label>)}</div>
    {!lok.length && <p className="text-xs text-amber-300 mb-2">Master lokasi belum diimpor, sehingga tidak ada marker. Posisi tidak ditebak; lihat daftar di bawah.</p>}
    <p className="text-xs text-slate-400 mb-2">Garis rute bersifat indikatif (asal–tujuan), bukan jalur pelayaran aktual. Tidak ada posisi kapal waktu nyata.</p>
    <div className="grid lg:grid-cols-[1fr_320px] gap-3"><div style={{ height: 520 }} className="rounded-lg overflow-hidden"><MapContainer center={[-2.5, 118]} zoom={5} style={{ height: '100%' }}>
      <TileLayer attribution="&copy; OpenStreetMap, &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {routes && fs.map((s, i) => { const a = loc.get(norm(s.asal)), b = loc.get(norm(s.pltu)); return a && b ? <Polyline key={i} positions={[[a.lat, a.lon], [b.lat, b.lon]]} pathOptions={{ color: STAGES.find(x => x.key === s.status)?.color ?? '#94a3b8', dashArray: '6', weight: 2 }} eventHandlers={{ click: () => setSel({ t: 'ship', v: s }) }} /> : null })}
      {located.map(n => { const l = loc.get(norm(n))!; return <CircleMarker key={n} center={[l.lat, l.lon]} radius={7 + Math.min(8, fs.filter(s => s.pltu === n).length)} pathOptions={{ color: '#e6b457', fillOpacity: .6 }} eventHandlers={{ click: () => setSel({ t: 'pltu', v: n }) }}><Tooltip>{n}</Tooltip></CircleMarker> })}
    </MapContainer></div>
    <div><Card title="Panel Detail">{!sel ? <p className="text-xs text-slate-400">Pilih marker PLTU atau garis rute.</p> : sel.t === 'pltu' ? (() => { const p = plants.find(x => x.pltu === sel.v); const sh = fs.filter(s => s.pltu === sel.v); return <div className="text-xs"><b>{sel.v}</b><div>Wilayah: {regOf(sel.v) ?? 'Data belum tersedia'}</div><div>Target: {p ? fmtNum(p.target) + ' MT' : 'Data belum tersedia'}</div>
      {p && STAGES.map(s => <div key={s.key}>{s.label}: {fmtNum(p[s.key])} MT</div>)}<div className="mt-2">Shipment terkait ({sh.length}):</div>{sh.map((s, i) => <button key={i} className="block text-[#e6b457] underline" onClick={() => setSel({ t: 'ship', v: s })}>{s.id} — {s.status ? stageLabel(s.status) : 'Belum Dipetakan'}</button>)}</div> })()
      : <div className="text-xs"><b>{sel.v.id}</b>{[['SI', 'si'], ['Tujuan', 'pltu'], ['Asal', 'asal'], ['Mitra Tambang', 'mitraTambang'], ['Mitra Transport', 'mitraTransport'], ['Kapal', 'kapal'], ['Status asli', 'statusRaw'], ['ETA', 'eta'], ['Keterangan', 'keterangan']].map(([l, k]) => <div key={k}>{l}: {sel.v[k] ?? 'Data belum tersedia'}</div>)}<div>Volume: {sel.v.volume != null ? fmtNum(sel.v.volume) + ' MT' : 'Data belum tersedia'}</div></div>}</Card>
      <Card title={`Lokasi Belum Memiliki Koordinat (${unlocated.length})`}><ul className="text-xs max-h-48 overflow-auto">{unlocated.map(n => <li key={n}>{n}</li>)}</ul></Card></div></div></>
}
