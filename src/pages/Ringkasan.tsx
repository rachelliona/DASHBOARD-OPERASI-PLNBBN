import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'
import { Card, Empty, Kpi } from '../components/ui'
import { STAGES } from '../domain/status'
import { sum, stageTotals, pct, plantActual, attention, distinctShipments, KPI_DEFS } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
export default function Ringkasan() {
  const { kinds, threshold } = useStore(); const plant = kinds.plant?.rows, ship = kinds.shipment?.rows
  if (!plant && !ship) return <Empty hint="Belum ada dataset PLTU atau shipment. Impor CSV di" />
  const target = plant ? sum(plant, 'target') : null, actual = plant ? sum(plant.map(r => ({ a: plantActual(r) })), 'a') : 0
  const tot = plant ? stageTotals(plant) : null; const att = plant ? attention(plant, threshold) : []
  return <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Kpi label="Total Target Pasokan" value={target == null ? 'Data Belum Tersedia' : fmtNum(target)} unit={target == null ? '' : 'MT'} tip={KPI_DEFS.target} />
      <Kpi label="Persentase Pemenuhan" value={fmtPct(target ? pct(actual, target) : null)} note="Provisional — definisi perlu konfirmasi" tip={KPI_DEFS.pemenuhan} />
      <Kpi label="Shipment (ID unik)" value={ship ? fmtNum(distinctShipments(ship)) : 'Data Belum Tersedia'} tip={KPI_DEFS.shipment} /></div>
    {tot && <Card title="Volume per Tahapan Shipment (MT)"><div style={{ height: 260 }}><ResponsiveContainer><BarChart data={STAGES.map(s => ({ n: s.label, v: tot[s.key], c: s.color }))}><XAxis dataKey="n" stroke="#9fb3d1" /><YAxis stroke="#9fb3d1" tickFormatter={v => fmtNum(v)} /><Tooltip formatter={(v: any) => fmtNum(v) + ' MT'} contentStyle={{ background: '#0b1f44' }} /><Bar dataKey="v" name="Volume">{STAGES.map(s => <Cell key={s.key} fill={s.color} />)}</Bar></BarChart></ResponsiveContainer></div></Card>}
    {plant && <Card title="PLTU & Shipment Perlu Perhatian" right={<Link className="text-sky-400 text-xs" to="/pltu">Lihat Detail</Link>}>
      <p className="text-xs text-slate-400 mb-2">Aturan: pemenuhan provisional (Unloading ÷ Target) di bawah {threshold}% dan target &gt; 0. Ambang dapat diubah di Pengaturan.</p>
      {att.length === 0 ? <p className="text-xs">Tidak ada PLTU yang memenuhi aturan.</p> : <table className="w-full text-xs"><thead><tr><th>PLTU</th><th>Wilayah</th><th>Pemenuhan</th><th>Alasan</th></tr></thead><tbody>{att.slice(0, 15).map((r, i) => <tr key={i} className="border-t border-sky-900/40"><td>{r.pltu}</td><td>{r.wilayah ?? '—'}</td><td>{fmtPct(r.p)}</td><td>Di bawah ambang {threshold}%</td></tr>)}</tbody></table>}</Card>}
  </>
}
