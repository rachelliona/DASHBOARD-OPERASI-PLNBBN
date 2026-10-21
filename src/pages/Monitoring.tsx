import { useState } from 'react'
import { useStore } from '../store'
import { Card, Empty } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, stageLabel } from '../domain/status'
import { pct, plantActual } from '../domain/kpi'
import { fmtNum, fmtPct, fmtDate } from '../domain/format'
import { KINDS } from '../domain/schema'
const Detail = ({ r, labels, onClose }: { r: any; labels: Record<string, string>; onClose: () => void }) => (
  <Card title="Detail" right={<button className="text-sm text-sky-400" onClick={onClose}>Tutup</button>}><dl className="grid grid-cols-2 gap-x-4 text-sm">{Object.entries(labels).map(([k, l]) => <div key={k} className="contents"><dt className="text-slate-400">{l}</dt><dd>{String(r[k] ?? 'Data belum tersedia')}</dd></div>)}</dl></Card>)
const lab = (kind: string) => Object.fromEntries(KINDS[kind].fields.map(f => [f.key, f.label]))
const shipCols: Col[] = [{ key: 'id', label: 'ID Shipment' }, { key: 'si', label: 'Nomor SI' }, { key: 'pltu', label: 'PLTU / IPP Tujuan' }, { key: 'asal', label: 'Asal' }, { key: 'mitraTambang', label: 'Mitra Tambang' }, { key: 'mitraTransport', label: 'Mitra Transport' }, { key: 'kapal', label: 'Kapal / Tongkang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: (v, r) => v ? stageLabel(v) : (r.statusRaw ? `Belum Dipetakan (${r.statusRaw})` : '—') }, { key: 'eta', label: 'ETA', fmt: v => fmtDate(v) }]
export function MonitoringShipment() {
  const { kinds } = useStore(); const ds = kinds.shipment; const [st, setSt] = useState(''); const [sel, setSel] = useState<any>(null)
  if (!ds) return <Empty hint="Impor dataset Shipment di" />
  const rows = ds.rows.filter(r => !st || (st === '_x' ? !r.status : r.status === st))
  return <><div className="mb-2 no-print"><select aria-label="Filter status" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}<option value="_x">Belum Dipetakan</option></select></div>
    <Card title="Daftar Shipment"><DataTable rows={rows} cols={shipCols} name="monitoring-shipment" onRow={setSel} /></Card>
    {sel && <Detail r={sel} labels={{ ...lab('shipment'), statusRaw: 'Status asli (sumber)' }} onClose={() => setSel(null)} />}
    <p className="text-xs text-slate-500">Sumber: {ds.source} · diimpor {ds.at} · {ds.rejected.length} baris ditolak (lihat Sumber Data dan Kualitas Data).</p></>
}
const pltuCols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Target (MT)', fmt: v => fmtNum(v) }, { key: 'p', label: 'Pemenuhan (provisional)', fmt: v => fmtPct(v) }, ...STAGES.map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })), { key: 'sumber', label: 'Sumber Tambang' }]
export function MonitoringPltu() {
  const { kinds } = useStore(); const ds = kinds.plant; const [sel, setSel] = useState<any>(null)
  if (!ds) return <Empty hint="Impor dataset PLTU di" />
  const ships = kinds.shipment?.rows ?? []
  return <><Card title="Monitoring Pasokan PLTU"><DataTable rows={ds.rows.map(r => ({ ...r, p: pct(plantActual(r), r.target) }))} cols={pltuCols} name="monitoring-pltu" onRow={setSel} /></Card>
    {sel && <><Detail r={sel} labels={lab('plant')} onClose={() => setSel(null)} />
      <Card title="Shipment Terkait">{!kinds.shipment ? <p className="text-sm">Dataset shipment belum diimpor.</p> : <DataTable rows={ships.filter(s => s.pltu === sel.pltu)} cols={shipCols} name="shipment-terkait" />}</Card></>}</>
}
export function RawPage({ title, sheets }: { title: string; sheets: string[] }) {
  const { raw, status } = useStore(); const [name, setName] = useState(sheets[0]); const d = raw[name]
  return <><h2 className="text-lg font-bold mb-2">{title}</h2>
    <div className="mb-2 no-print"><select aria-label="Pilih sheet" value={name} onChange={e => setName(e.target.value)}>{sheets.map(s => <option key={s}>{s}</option>)}</select> <span className="text-xs text-slate-400">Status: {raw[name] ? 'Data tersedia (mentah, belum dipetakan)' : status[name]?.state ?? 'Belum Terhubung'}</span></div>
    {!d ? <Empty hint={`Sheet "${name}" belum dimuat. Hubungkan atau impor di`} /> : <Card title={name}><p className="text-xs text-amber-300 mb-2">Judul kolom mengikuti CSV asli. Definisi KPI untuk sheet ini belum dikonfirmasi, jadi tidak ada angka turunan yang ditampilkan.</p>
      <DataTable rows={d.rows} cols={(d.headers ?? []).map(h => ({ key: h, label: h }))} name={name} /></Card>}</>
}
