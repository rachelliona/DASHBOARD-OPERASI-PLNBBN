import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDetail } from '../components/Detail'
import { useStore } from '../store'
import { Btn, Card, Empty, PageHead } from '../components/ui'
import { Factory, Ship } from 'lucide-react'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, STATUSES, stageLabel } from '../domain/status'
import { pct, plantActual, kebutuhan } from '../domain/kpi'
import { fmtNum, fmtPct, fmtDate } from '../domain/format'
import { REGIONS } from '../domain/status'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
import { KINDS } from '../domain/schema'
import SheetViz from '../components/SheetViz'
import Gantt from '../components/Gantt'
import { todayRef } from '../domain/insight'
const Detail = ({ r, labels, onClose }: { r: any; labels: Record<string, string>; onClose: () => void }) => (
  <Card title="Detail" right={<button className="text-xs text-[#e6b457]" onClick={onClose}>Tutup</button>}><dl className="grid grid-cols-2 gap-x-4 text-xs">{Object.entries(labels).map(([k, l]) => <div key={k} className="contents"><dt className="text-slate-400">{l}</dt><dd>{String(r[k] ?? 'Data belum tersedia')}</dd></div>)}</dl></Card>)
const lab = (kind: string) => Object.fromEntries(KINDS[kind].fields.map(f => [f.key, f.label]))
const shipCols: Col[] = [{ key: 'id', label: 'ID Shipment' }, { key: 'si', label: 'Nomor SI' }, { key: 'pltu', label: 'PLTU / IPP Tujuan' }, { key: 'asal', label: 'Asal' }, { key: 'mitraTambang', label: 'Mitra Tambang' }, { key: 'mitraTransport', label: 'Mitra Transport' }, { key: 'kapal', label: 'Kapal / Tongkang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: (v, r) => v ? stageLabel(v) : (r.statusRaw ? `Belum Dipetakan (${r.statusRaw})` : '—') }, { key: 'eta', label: 'ETA', fmt: v => fmtDate(v) }]
export function MonitoringShipment() {
  const { kinds } = useStore(); const ds = kinds.shipment; const [st, setSt] = useState(''); const dt = useDetail(); const labels: Record<string, string> = { ...lab('shipment'), statusRaw: 'Status asli (sumber)' }
  const setSel = (r: any) => dt.open({ title: r.id ?? 'Shipment', sub: `${r.pltu ?? '—'} · ${stageLabel(r.status ?? '')}`, color: '#38bdf8', stats: [{ l: 'Volume', v: fmtNum(r.volume ?? 0) + ' MT' }, { l: 'Status', v: stageLabel(r.status ?? '') || '—' }], table: { head: ['Kolom', 'Nilai'], rows: Object.entries(labels).map(([k, l]) => [l, r[k] == null || r[k] === '' ? 'Data belum tersedia' : String(r[k])]) }, actions: r.pltu ? [{ label: 'Buka halaman PLTU', to: '/pltu/' + encodeURIComponent(r.pltu) }] : [] })
  if (!ds) return <Empty hint="Impor dataset Shipment di" />
  const rows = ds.rows.filter(r => !st || (st === '_x' ? !r.status : r.status === st))
  return <><PageHead icon={Ship} color="#38bdf8" title="Monitoring Shipment" sub={`${ds.rows.length} shipment · klik baris untuk detail`} /><div className="chips flex flex-wrap gap-1.5 mb-3 no-print">{[{ key: '', label: 'Semua', color: '#9aa3b2' }, ...STATUSES.filter(s => s.key !== 'carryOver'), { key: '_x', label: 'Belum Dipetakan', color: '#6b7280' }].map(s => { const n = s.key === '' ? ds.rows.length : s.key === '_x' ? ds.rows.filter(r => !r.status).length : ds.rows.filter(r => r.status === s.key).length; return <button key={s.key} onClick={() => setSt(s.key)} className={'fchip' + (st === s.key ? ' on' : '')} style={{ ['--c' as any]: s.color }}>{s.label} <b>{n}</b></button> })}</div>
    <Card title="Daftar Shipment"><DataTable rows={rows} cols={shipCols} name="monitoring-shipment" onRow={setSel} /></Card>
    <p className="text-xs text-slate-500">Sumber: {ds.source} · diimpor {ds.at} · {ds.rejected.length} baris ditolak (lihat Sumber Data dan Kualitas Data).</p></>
}
const pltuCols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: v => fmtNum(v) }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: v => fmtNum(v) }, { key: 'p', label: 'Pemenuhan', fmt: v => fmtPct(v) }, ...STAGES.map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })), { key: 'sumber', label: 'Sumber Tambang' }]
export function MonitoringPltu() {
  const { kinds, monthly, asOf } = useStore(); const ds = kinds.plant; const nav = useNavigate(); const [view, setView] = useState<'kartu' | 'tabel'>('kartu'); const [reg, setReg] = useState(''); const [all, setAll] = useState(false)
  if (!ds) return <Empty />
  const ships = kinds.shipment?.rows ?? []; const SK = STATUSES.filter(s => s.key !== 'carryOver')
  const rows = ds.rows.filter(r => (!reg || r.wilayah === reg) && (all || r.n > 0)).map(r => ({ ...r, p: pct(plantActual(r), kebutuhan(r)) }) as Record<string, any>)
  return <>
    <PageHead icon={Factory} color="#22d3ee" title="Pasokan PLTU" sub={`${rows.length} PLTU · klik kartu untuk detail dan shipment terkait`} />
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print"><select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <label><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> tampilkan PLTU tanpa shipment</label><Btn onClick={() => setView(view === 'kartu' ? 'tabel' : 'kartu')}>Tampilan {view === 'kartu' ? 'Tabel' : 'Kartu'}</Btn></div>
    {view === 'kartu' ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">{rows.map(r => { const tot = SK.reduce((a, s) => a + (r[s.key] ?? 0), 0) || 1; const rc = REGION_COLOR[r.wilayah] ?? '#94a3b8'; return <button key={r.pltu} onClick={() => nav('/pltu/' + encodeURIComponent(r.pltu))} data-tip="Klik untuk membuka halaman PLTU" className="pcard" style={{ ['--c' as any]: rc }}>
      <div className="flex items-center gap-3"><div className="ring" style={{ ['--p' as any]: Math.min(100, r.p ?? 0), ['--t' as any]: tone(r.p) }}><span style={{ color: tone(r.p) }}>{r.p == null ? '—' : Math.round(r.p) + '%'}</span></div>
        <div className="min-w-0 flex-1"><div className="text-[13px] font-bold truncate">{r.pltu}</div><div className="text-[10.5px] flex items-center gap-1.5 mt-0.5 text-slate-400"><i style={{ width: 7, height: 7, borderRadius: 99, background: rc, display: 'inline-block' }} />{r.wilayah ?? 'Tanpa wilayah'} · {r.n} shipment</div></div></div>
      <div className="sbar mt-3">{SK.map(s => <i key={s.key} title={`${s.label}: ${fmtNum(r[s.key])} MT`} style={{ width: `${(r[s.key] ?? 0) / tot * 100}%`, background: s.color }} />)}</div>
      <div className="flex justify-between text-[11px] text-slate-400 mt-2"><span>Kebutuhan <b className="text-slate-200 num">{fmtNum(kebutuhan(r))}</b></span><span>D/S <b className="num" style={{ color: tone(r.p) }}>{fmtNum(r.ds)}</b> MT</span></div>
      </button> })}</div>
      : <Card title="Monitoring Pasokan PLTU"><DataTable rows={rows} cols={pltuCols} name="monitoring-pltu" onRow={(r: any) => nav('/pltu/' + encodeURIComponent(r.pltu))} /></Card>}
  </>
}
export function SheetPage() {
  const { name = '' } = useParams(); const { raw, status, fetchSheet, asOf } = useStore(); const d = raw[name]; const st = status[name]
  useEffect(() => { if (!raw[name] && !status[name]) fetchSheet(name) }, [name])
  return <>{asOf && <Card><p className="text-xs text-amber-300">Data mentah sheet hanya tersedia untuk tanggal langsung. Saat ini kamu melihat keadaan {fmtDate(asOf)}; pilih "Langsung" di bagian atas untuk membuka sheet ini.</p></Card>}<div className="flex items-center gap-2 mb-2 no-print"><h2 className="font-semibold">{name}</h2><Btn onClick={() => fetchSheet(name)}>Perbarui Data</Btn><span className="text-xs text-slate-400">{st?.state ?? ''}{st?.at ? ` · ${st.at}` : ''}</span></div>
    {st?.msg && <p className="text-xs text-amber-300 mb-2">{st.msg}.{d ? ' Menampilkan data terakhir yang berhasil dimuat.' : ''}</p>}
    {!d ? (st?.state === 'Gagal Diakses' ? <Empty text="Gagal Mengambil Data" hint="Klik Perbarui Data, atau impor CSV di" /> : <Card><p className="text-xs">Memuat Data…</p></Card>)
      : <><p className="text-[11px] text-slate-500 mb-2">Tampilan visual dibuat otomatis dari kolom sheet (angka, tanggal, kategori). Baris judul kolom: {d.headerRow} · sel error Sheets dianggap kosong: {d.errorCells}. Gunakan tombol Tabel untuk data apa adanya.</p><SheetViz key={name} name={name} headers={d.headers ?? []} rows={d.rows as any} /></>}</>
}
