import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store'
import { Bar, Btn, Card, Empty } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, STATUSES, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct, fmtDate } from '../domain/format'
import { REGIONS } from '../domain/status'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
import { KINDS } from '../domain/schema'
const Detail = ({ r, labels, onClose }: { r: any; labels: Record<string, string>; onClose: () => void }) => (
  <Card title="Detail" right={<button className="text-xs text-[#e6b457]" onClick={onClose}>Tutup</button>}><dl className="grid grid-cols-2 gap-x-4 text-xs">{Object.entries(labels).map(([k, l]) => <div key={k} className="contents"><dt className="text-slate-400">{l}</dt><dd>{String(r[k] ?? 'Data belum tersedia')}</dd></div>)}</dl></Card>)
const lab = (kind: string) => Object.fromEntries(KINDS[kind].fields.map(f => [f.key, f.label]))
const shipCols: Col[] = [{ key: 'id', label: 'ID Shipment' }, { key: 'si', label: 'Nomor SI' }, { key: 'pltu', label: 'PLTU / IPP Tujuan' }, { key: 'asal', label: 'Asal' }, { key: 'mitraTambang', label: 'Mitra Tambang' }, { key: 'mitraTransport', label: 'Mitra Transport' }, { key: 'kapal', label: 'Kapal / Tongkang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: (v, r) => v ? stageLabel(v) : (r.statusRaw ? `Belum Dipetakan (${r.statusRaw})` : '—') }, { key: 'eta', label: 'ETA', fmt: v => fmtDate(v) }]
export function MonitoringShipment() {
  const { kinds } = useStore(); const ds = kinds.shipment; const [st, setSt] = useState(''); const [sel, setSel] = useState<any>(null)
  if (!ds) return <Empty hint="Impor dataset Shipment di" />
  const rows = ds.rows.filter(r => !st || (st === '_x' ? !r.status : r.status === st))
  return <><div className="flex flex-wrap gap-1.5 mb-2 no-print">{[{ key: '', label: 'Semua', color: '#9aa3b2' }, ...STATUSES.filter(s => s.key !== 'carryOver'), { key: '_x', label: 'Belum Dipetakan', color: '#6b7280' }].map(s => { const n = s.key === '' ? ds.rows.length : s.key === '_x' ? ds.rows.filter(r => !r.status).length : ds.rows.filter(r => r.status === s.key).length; return <button key={s.key} onClick={() => setSt(s.key)} className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: s.color, background: st === s.key ? s.color : 'transparent', color: st === s.key ? '#15130d' : s.color }}>{s.label} · {n}</button> })}</div>
    <Card title="Daftar Shipment"><DataTable rows={rows} cols={shipCols} name="monitoring-shipment" onRow={setSel} /></Card>
    {sel && <Detail r={sel} labels={{ ...lab('shipment'), statusRaw: 'Status asli (sumber)' }} onClose={() => setSel(null)} />}
    <p className="text-xs text-slate-500">Sumber: {ds.source} · diimpor {ds.at} · {ds.rejected.length} baris ditolak (lihat Sumber Data dan Kualitas Data).</p></>
}
const pltuCols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: v => fmtNum(v) }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: v => fmtNum(v) }, { key: 'p', label: 'Pemenuhan', fmt: v => fmtPct(v) }, ...STAGES.map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })), { key: 'sumber', label: 'Sumber Tambang' }]
export function MonitoringPltu() {
  const { kinds } = useStore(); const ds = kinds.plant; const [sel, setSel] = useState<any>(null); const [view, setView] = useState<'kartu' | 'tabel'>('kartu'); const [reg, setReg] = useState(''); const [all, setAll] = useState(false)
  if (!ds) return <Empty />
  const ships = kinds.shipment?.rows ?? []; const SK = STATUSES.filter(s => s.key !== 'carryOver')
  const rows = ds.rows.filter(r => (!reg || r.wilayah === reg) && (all || r.n > 0)).map(r => ({ ...r, p: pct(plantActual(r), kebutuhan(r)) }) as Record<string, any>)
  return <>
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs no-print"><select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <label><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> tampilkan PLTU tanpa shipment</label><Btn onClick={() => setView(view === 'kartu' ? 'tabel' : 'kartu')}>Tampilan {view === 'kartu' ? 'Tabel' : 'Kartu'}</Btn><span className="text-slate-500">{rows.length} PLTU</span></div>
    {view === 'kartu' ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">{rows.map(r => { const tot = SK.reduce((a, s) => a + (r[s.key] ?? 0), 0) || 1; return <button key={r.pltu} onClick={() => setSel(r)} className="text-left rounded-xl border bg-[#171a21] p-3 hover:bg-white/5" style={{ borderColor: sel?.pltu === r.pltu ? REGION_COLOR[r.wilayah] ?? '#888' : 'rgba(255,255,255,.1)' }}>
      <div className="flex justify-between text-xs"><b>{r.pltu}</b><span className="num font-semibold" style={{ color: tone(r.p) }}>{fmtPct(r.p)}</span></div><div className="text-[10px] mb-1.5" style={{ color: REGION_COLOR[r.wilayah] }}>{r.wilayah ?? 'Tanpa wilayah'} · {r.n} shipment</div><Bar pct={r.p} color={tone(r.p)} />
      <div className="flex h-2 rounded overflow-hidden mt-1.5 bg-white/5">{SK.map(s => <div key={s.key} title={`${s.label}: ${fmtNum(r[s.key])} MT`} style={{ width: `${(r[s.key] ?? 0) / tot * 100}%`, background: s.color }} />)}</div>
      <div className="text-[11px] text-slate-400 mt-1">Kebutuhan {fmtNum(kebutuhan(r))} · D/S {fmtNum(r.ds)} MT</div></button> })}</div>
      : <Card title="Monitoring Pasokan PLTU"><DataTable rows={rows} cols={pltuCols} name="monitoring-pltu" onRow={setSel} /></Card>}
    {sel && <><Detail r={sel} labels={lab('plant')} onClose={() => setSel(null)} />
      <Card title="Shipment Terkait">{!kinds.shipment ? <p className="text-xs">Dataset shipment belum tersedia.</p> : <DataTable rows={ships.filter(s => s.pltu === sel.pltu)} cols={shipCols} name="shipment-terkait" />}</Card></>}</>
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
