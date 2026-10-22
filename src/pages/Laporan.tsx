import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { Btn, Card, Empty } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, REGIONS, norm } from '../domain/status'
import { pct, plantActual } from '../domain/kpi'
import { fmtNum, fmtPct, fmtDate } from '../domain/format'
const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Target (MT)', fmt: v => fmtNum(v) },
  { key: 'p', label: 'Pemenuhan (provisional)', fmt: v => fmtPct(v) }, ...STAGES.map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })),
  { key: 'sumber', label: 'Sumber Tambang' }, { key: 'keterangan', label: 'Keterangan' }]
export default function Laporan() {
  const { kinds } = useStore(); const ds = kinds.plant
  const [reg, setReg] = useState(REGIONS[0]); const [q, setQ] = useState(''); const [stage, setStage] = useState(''); const [mode, setMode] = useState<'grafik' | 'tabel'>('grafik'); const [date, setDate] = useState('')
  if (!ds) return <Empty hint="Laporan Harian memerlukan dataset PLTU. Impor di" />
  const unmatched = ds.rows.filter(r => !REGIONS.some(g => norm(g) === norm(r.wilayah))).length
  const rows = ds.rows.filter(r => norm(r.wilayah) === norm(reg) && (!q || norm(r.pltu).includes(norm(q))) && (!stage || (r[stage] ?? 0) > 0)).map(r => ({ ...r, p: pct(plantActual(r), r.target) }) as Record<string, any>)
  return <>
    <div className="mb-3"><h2 className="text-lg font-bold">UPDATE MONITORING PASOKAN PLTU — PT PLN BATUBARA NIAGA</h2><p className="text-xs text-slate-400">Tanggal laporan: {date ? fmtDate(date) : 'belum dipilih'} · Wilayah: {reg} · Diimpor: {ds.at} · Satuan: MT</p></div>
    <div className="flex flex-wrap gap-2 mb-3 no-print">
      {REGIONS.map(g => <Btn key={g} className={reg === g ? '' : '!bg-slate-700'} onClick={() => setReg(g)}>{g}</Btn>)}
      <input type="date" aria-label="Tanggal laporan" value={date} onChange={e => setDate(e.target.value)} />
      <input aria-label="Cari PLTU" placeholder="Cari PLTU…" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Filter tahapan" value={stage} onChange={e => setStage(e.target.value)}><option value="">Semua tahapan</option>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      <Btn onClick={() => setMode(mode === 'grafik' ? 'tabel' : 'grafik')}>Tampilan {mode === 'grafik' ? 'Tabel' : 'Grafik'}</Btn><Btn onClick={() => window.print()}>Ekspor ke PDF</Btn></div>
    {unmatched > 0 && <p className="text-xs text-amber-300 mb-2">{unmatched} baris memiliki wilayah di luar enam bagian laporan dan tidak ditampilkan di tab mana pun.</p>}
    <p className="text-xs text-slate-400 mb-2">Perbandingan dengan laporan sebelumnya belum tersedia: belum ada snapshot historis (riwayat tidak direkonstruksi dari data hari ini).</p>
    {rows.length === 0 ? <Card><p className="text-xs">Data Belum Tersedia untuk filter ini.</p></Card> : mode === 'grafik'
      ? <Card title={`Grafik Pemenuhan Pasokan (${reg})`}><div style={{ height: rows.length * 34 + 90 }}><ResponsiveContainer><BarChart layout="vertical" data={rows} margin={{ left: 20 }}><XAxis type="number" stroke="#9fb3d1" tickFormatter={v => fmtNum(v)} /><YAxis type="category" dataKey="pltu" width={150} stroke="#9fb3d1" /><Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#0b1f44' }} /><Legend />
        {STAGES.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />)}</BarChart></ResponsiveContainer></div>
        <table className="text-xs mt-2"><thead><tr><th>PLTU</th><th>Pemenuhan (provisional)</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td className="pr-6">{r.pltu}</td><td>{fmtPct(r.p)}</td></tr>)}</tbody></table></Card>
      : <Card title={`Rincian ${reg}`}><DataTable rows={rows} cols={cols} name={`laporan-harian-${norm(reg)}`} /></Card>}
  </>
}
