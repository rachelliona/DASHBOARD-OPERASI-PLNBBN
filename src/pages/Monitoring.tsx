import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store'
import { Btn, Card, Empty } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, STATUSES, stageLabel } from '../domain/status'
import { pct, plantActual } from '../domain/kpi'
import { fmtNum, fmtPct, fmtDate } from '../domain/format'
import { KINDS } from '../domain/schema'
const Detail = ({ r, labels, onClose }: { r: any; labels: Record<string, string>; onClose: () => void }) => (
  <Card title="Detail" right={<button className="text-xs text-sky-400" onClick={onClose}>Tutup</button>}><dl className="grid grid-cols-2 gap-x-4 text-xs">{Object.entries(labels).map(([k, l]) => <div key={k} className="contents"><dt className="text-slate-400">{l}</dt><dd>{String(r[k] ?? 'Data belum tersedia')}</dd></div>)}</dl></Card>)
const lab = (kind: string) => Object.fromEntries(KINDS[kind].fields.map(f => [f.key, f.label]))
const shipCols: Col[] = [{ key: 'id', label: 'ID Shipment' }, { key: 'si', label: 'Nomor SI' }, { key: 'pltu', label: 'PLTU / IPP Tujuan' }, { key: 'asal', label: 'Asal' }, { key: 'mitraTambang', label: 'Mitra Tambang' }, { key: 'mitraTransport', label: 'Mitra Transport' }, { key: 'kapal', label: 'Kapal / Tongkang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: (v, r) => v ? stageLabel(v) : (r.statusRaw ? `Belum Dipetakan (${r.statusRaw})` : '—') }, { key: 'eta', label: 'ETA', fmt: v => fmtDate(v) }]
export function MonitoringShipment() {
  const { kinds } = useStore(); const ds = kinds.shipment; const [st, setSt] = useState(''); const [sel, setSel] = useState<any>(null)
  if (!ds) return <Empty hint="Impor dataset Shipment di" />
  const rows = ds.rows.filter(r => !st || (st === '_x' ? !r.status : r.status === st))
  return <><div className="mb-2 no-print"><select aria-label="Filter status" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}<option value="_x">Belum Dipetakan</option></select></div>
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
      <Card title="Shipment Terkait">{!kinds.shipment ? <p className="text-xs">Dataset shipment belum diimpor.</p> : <DataTable rows={ships.filter(s => s.pltu === sel.pltu)} cols={shipCols} name="shipment-terkait" />}</Card></>}</>
}
export function SheetPage() {
  const { name = '' } = useParams(); const { raw, status, fetchSheet } = useStore(); const d = raw[name]; const st = status[name]
  useEffect(() => { if (!raw[name] && !status[name]) fetchSheet(name) }, [name])
  return <><div className="flex items-center gap-2 mb-2 no-print"><h2 className="font-semibold">{name}</h2><Btn onClick={() => fetchSheet(name)}>Perbarui Data</Btn><span className="text-xs text-slate-400">{st?.state ?? ''}{st?.at ? ` · ${st.at}` : ''}</span></div>
    {st?.msg && <p className="text-xs text-amber-300 mb-2">{st.msg}.{d ? ' Menampilkan data terakhir yang berhasil dimuat.' : ''}</p>}
    {!d ? (st?.state === 'Gagal Diakses' ? <Empty text="Gagal Mengambil Data" hint="Klik Perbarui Data, atau impor CSV di" /> : <Card><p className="text-xs">Memuat Data…</p></Card>)
      : <Card title={`${fmtNum(d.rows.length)} baris`}><p className="text-xs text-slate-400 mb-1">Baris judul kolom: {d.headerRow}. Sel error Sheets dianggap kosong: {d.errorCells}. Baris subtotal dan judul kelompok dari sheet tampil apa adanya. Satuan dan definisi kolom mengikuti sheet asli.</p>
        <DataTable rows={d.rows} cols={(d.headers ?? []).map(h => ({ key: h, label: h }))} name={name} /></Card>}</>
}
