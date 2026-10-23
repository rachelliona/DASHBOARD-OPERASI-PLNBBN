import { useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'
import { Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STATUSES, stageLabel } from '../domain/status'
import { fmtNum } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
type F = Record<string, string>
const cols: Col[] = [{ key: 'id', label: 'Shipment' }, { key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'mitra', label: 'Mitra' }, { key: 'mitraTambang', label: 'Sumber Tambang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
const KONF: Record<string, string> = { bulan: 'Konfirmasi bulan ini', carry: 'Carry Over', lain: 'Konfirmasi bulan lain' }
export default function Dashboard() {
  const { kinds, bulanAktif } = useStore(); const [f, setF] = useState<F>({}); const ships = kinds.shipment?.rows
  if (!ships) return <Empty />
  const flip = (k: string, v: string) => setF(p => { const n = { ...p }; if (n[k] === v) delete n[k]; else n[k] = v; return n })
  const ok = (s: any, skip = '') => (skip === 'wilayah' || !f.wilayah || s.wilayah === f.wilayah) && (skip === 'mitra' || !f.mitra || (s.mitra ?? '—') === f.mitra) && (skip === 'status' || !f.status || s.status === f.status) && (skip === 'konf' || !f.konf || s.konf === f.konf) && (skip === 'sumber' || !f.sumber || (s.mitraTambang ?? '—') === f.sumber)
  const agg = (dim: string, key: (s: any) => string, top = 10) => { const m = new Map<string, number>(); ships.filter(s => ok(s, dim)).forEach(s => { const k = key(s) || '—'; m.set(k, (m.get(k) ?? 0) + (s.volume ?? 0)) }); return [...m].map(([nama, vol]) => ({ nama, vol })).sort((a, b) => b.vol - a.vol).slice(0, top) }
  const rows = ships.filter(s => ok(s)); const vol = rows.reduce((a, s) => a + (s.volume ?? 0), 0)
  const charts: { dim: string; title: string; data: any[]; color: (n: string) => string; label?: (n: string) => string }[] = [
    { dim: 'wilayah', title: 'Volume per Wilayah', data: agg('wilayah', s => s.wilayah ?? 'Tanpa wilayah'), color: n => REGION_COLOR[n] ?? '#9ca3af' },
    { dim: 'status', title: 'Volume per Tahapan', data: agg('status', s => s.status ?? 'tanpa'), color: n => STATUSES.find(x => x.key === n)?.color ?? '#6b7280', label: n => n === 'tanpa' ? 'Tanpa status' : stageLabel(n) },
    { dim: 'mitra', title: 'Volume per Mitra', data: agg('mitra', s => s.mitra ?? '—'), color: () => '#e6b457' },
    { dim: 'sumber', title: 'Volume per Sumber Tambang', data: agg('sumber', s => s.mitraTambang ?? '—', 8), color: () => '#a78bfa' },
    { dim: 'konf', title: 'Konfirmasi vs Carry Over', data: agg('konf', s => s.konf), color: n => n === 'carry' ? '#fb7185' : '#34d399', label: n => KONF[n] ?? n }]
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">Dashboard Interaktif — {bulanAktif} 2026</h2><p className="text-[11px] text-slate-500">Klik batang pada grafik mana pun untuk menyaring semua grafik; klik lagi untuk melepas.</p></div>
    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">{Object.entries(f).map(([k, v]) => <button key={k} onClick={() => flip(k, v)} className="rounded-full border border-[#e6b457] px-2.5 py-0.5 text-xs text-[#e6b457]">{k === 'status' ? stageLabel(v) : k === 'konf' ? KONF[v] : v} ✕</button>)}{Object.keys(f).length === 0 && <span className="text-[11px] text-slate-500 self-center">Belum ada penyaring aktif</span>}</div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><Kpi label="Shipment" value={fmtNum(rows.length)} accent="#e6b457" /><Kpi label="Volume" value={fmtNum(vol)} unit="MT" accent="#34d399" /><Kpi label="PLTU" value={fmtNum(new Set(rows.map(s => s.pltu)).size)} accent="#38bdf8" /><Kpi label="Mitra" value={fmtNum(new Set(rows.map(s => s.mitra ?? '—')).size)} accent="#a78bfa" /></div>
    <div className="grid lg:grid-cols-2 gap-3">{charts.map(c => <Card key={c.dim} title={c.title}><div style={{ height: c.data.length * 26 + 30 }}><ResponsiveContainer><BarChart layout="vertical" data={c.data} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}><XAxis type="number" stroke="#9aa3b2" fontSize={10} tickFormatter={v => fmtNum(v / 1000) + 'rb'} /><YAxis type="category" dataKey="nama" width={140} stroke="#9aa3b2" fontSize={11} interval={0} tickFormatter={(n: string) => (c.label ? c.label(n) : n).slice(0, 22)} />
      <Tooltip formatter={(v: any) => [fmtNum(v) + ' MT', 'Volume']} labelFormatter={(n: any) => c.label ? c.label(n) : n} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
      <RBar dataKey="vol" barSize={14} cursor="pointer" onClick={(d: any) => flip(c.dim, d.nama ?? d.payload?.nama)}>{c.data.map((d, i) => <Cell key={i} fill={c.color(d.nama)} fillOpacity={f[c.dim] && f[c.dim] !== d.nama ? 0.3 : 1} />)}</RBar></BarChart></ResponsiveContainer></div></Card>)}</div>
    <Card title={`Shipment terpilih (${rows.length})`}><DataTable rows={rows} cols={cols} name="dashboard-shipment" /></Card>
  </>
}
