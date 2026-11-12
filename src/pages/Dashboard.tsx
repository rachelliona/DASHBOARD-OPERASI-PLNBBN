import { useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, Legend } from 'recharts'
import { LayoutDashboard, X, Layers, Users, MapPinned, Table2, Ship, Boxes, Building2, Handshake } from 'lucide-react'
import { useDetail } from '../components/Detail'
import { TIP, AXIS } from '../components/chartTheme'
import { useStore } from '../store'
import { Card, Empty, PageHead } from '../components/ui'
import { StatTile } from '../components/Anim'
import { DataTable, Col } from '../components/DataTable'
import { STATUSES, stageLabel } from '../domain/status'
import { fmtNum } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
type F = Record<string, string>
const cols: Col[] = [{ key: 'id', label: 'Shipment' }, { key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'mitra', label: 'Mitra' }, { key: 'mitraTambang', label: 'Sumber Tambang' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
const KONF: Record<string, string> = { bulan: 'Konfirmasi bulan ini', carry: 'Carry Over', lain: 'Konfirmasi bulan lain' }
export default function Dashboard() {
  const { kinds, bulanAktif } = useStore(); const dt = useDetail(); const [tab, setTab] = useState<'ikhtisar' | 'mitra' | 'pltu' | 'tabel'>('ikhtisar'); const [f, setF] = useState<F>({}); const ships = kinds.shipment?.rows
  if (!ships) return <Empty />
  const flip = (k: string, v: string) => setF(p => { const n = { ...p }; if (n[k] === v) delete n[k]; else n[k] = v; return n })
  const ok = (s: any, skip = '') => (skip === 'wilayah' || !f.wilayah || s.wilayah === f.wilayah) && (skip === 'mitra' || !f.mitra || (s.mitra ?? '—') === f.mitra) && (skip === 'status' || !f.status || s.status === f.status) && (skip === 'konf' || !f.konf || s.konf === f.konf) && (skip === 'sumber' || !f.sumber || (s.mitraTambang ?? '—') === f.sumber)
  const agg = (dim: string, key: (s: any) => string, top = 10) => { const m = new Map<string, number>(); ships.filter(s => ok(s, dim)).forEach(s => { const k = key(s) || '—'; m.set(k, (m.get(k) ?? 0) + (s.volume ?? 0)) }); return [...m].map(([nama, vol]) => ({ nama, vol })).sort((a, b) => b.vol - a.vol).slice(0, top) }
  const rows = ships.filter(s => ok(s)); const vol = rows.reduce((a, s) => a + (s.volume ?? 0), 0)
  const charts: { dim: string; title: string; data: any[]; color: (n: string) => string; label?: (n: string) => string }[] = [
    { dim: 'wilayah', title: 'Volume per Wilayah', data: agg('wilayah', s => s.wilayah ?? 'Tanpa wilayah'), color: n => REGION_COLOR[n] ?? '#9ca3af' },
    { dim: 'status', title: 'Volume per Tahapan', data: agg('status', s => s.status ?? 'tanpa'), color: n => STATUSES.find(x => x.key === n)?.color ?? '#6b7280', label: n => n === 'tanpa' ? 'Tanpa status' : stageLabel(n) },
    { dim: 'mitra', title: 'Volume per Mitra', data: agg('mitra', s => s.mitra ?? '—'), color: () => '#60a5fa' },
    { dim: 'sumber', title: 'Volume per Sumber Tambang', data: agg('sumber', s => s.mitraTambang ?? '—', 8), color: () => '#22d3ee' },
    { dim: 'konf', title: 'Konfirmasi vs Carry Over', data: agg('konf', s => s.konf), color: n => n === 'carry' ? '#ef4444' : n === 'bulan' ? '#e6b457' : '#94a3b8', label: n => KONF[n] ?? n }]
  const KEYF: Record<string, (s: any) => string> = { wilayah: s => s.wilayah ?? 'Tanpa wilayah', status: s => s.status ?? 'tanpa', mitra: s => s.mitra ?? '—', sumber: s => s.mitraTambang ?? '—', konf: s => s.konf, pltu: s => s.pltu ?? '—' }
  const pickBar = (c: { dim: string; title: string; label?: (n: string) => string }, name: string) => { const x = rows.filter(s => (KEYF[c.dim]?.(s) ?? '—') === name); const v = x.reduce((a, s) => a + (s.volume ?? 0), 0); const nm = c.label ? c.label(name) : name
    dt.open({ title: nm, sub: c.title, color: '#a78bfa', stats: [{ l: 'Shipment', v: fmtNum(x.length) }, { l: 'Volume', v: fmtNum(v) + ' MT' }, { l: 'Porsi volume', v: vol ? fmtNum(v / vol * 100, 1) + '%' : '—' }, { l: 'PLTU', v: fmtNum(new Set(x.map(s => s.pltu)).size) }],
      stack: { title: 'Komposisi tahapan (volume)', unit: 'MT', items: STATUSES.filter(z => z.key !== 'carryOver').map(z => ({ l: z.label, v: x.filter(s => s.status === z.key).reduce((a, s) => a + (s.volume ?? 0), 0), c: z.color })) },
      bars: [{ title: 'PLTU tujuan terbesar', unit: 'MT', fmt: v => fmtNum(v), items: [...x.reduce<Map<string, number>>((m, s) => m.set(s.pltu ?? '—', (m.get(s.pltu ?? '—') ?? 0) + (s.volume ?? 0)), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v]) => ({ l, v, c: '#34d399' })) }, { title: 'Mitra terbesar', unit: 'MT', fmt: v => fmtNum(v), items: [...x.reduce<Map<string, number>>((m, s) => m.set(s.mitra ?? '—', (m.get(s.mitra ?? '—') ?? 0) + (s.volume ?? 0)), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v]) => ({ l, v, c: '#f472b6' })) }],
      table: { head: ['Shipment', 'PLTU', 'Mitra', 'Volume (MT)'], rows: [...x].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 12).map(s => [s.id, s.pltu, s.mitra ?? '—', fmtNum(s.volume ?? 0)]), align: ['l', 'l', 'l', 'r'] }, note: x.length > 12 ? `Menampilkan 12 terbesar dari ${x.length} shipment.` : undefined,
      actions: [{ label: f[c.dim] === name ? 'Lepas saringan' : 'Saring semua grafik ke ini', onClick: () => flip(c.dim, name) }, { label: 'Lihat tabel', onClick: () => setTab('tabel') }] }) }
  const kpi = (title: string, color: string, v: string) => () => dt.open({ title, color, sub: `${bulanAktif} 2026 · sesuai saringan aktif`, stats: [{ l: title, v }, ...(title === 'Shipment' ? [] : [{ l: 'Shipment', v: fmtNum(rows.length) }]), ...(title === 'Volume' ? [] : [{ l: 'Volume', v: fmtNum(vol) + ' MT' }])], actions: [{ label: 'Lihat tabel', onClick: () => setTab('tabel') }] })
  const pie = agg('status', s => s.status ?? 'tanpa').map(d => ({ ...d, name: d.nama === 'tanpa' ? 'Tanpa status' : stageLabel(d.nama), fill: STATUSES.find(x => x.key === d.nama)?.color ?? '#6b7280' }))
  const byPltu = { dim: 'pltu', title: 'Volume per PLTU (12 terbesar)', data: agg('pltu', s => s.pltu ?? '—', 12), color: () => '#34d399' }
  const stack = ['JAMALI', 'Sumatra', 'Kalimantan', 'Sulmapana 1', 'Sulmapana 2', 'PLTU IPP'].map(r => { const o: any = { wil: r }; STATUSES.filter(x => x.key !== 'carryOver').forEach(x => { o[x.key] = ships.filter(s => s.wilayah === r && s.status === x.key).reduce((a, s) => a + (s.volume ?? 0), 0) }); return o })
  const Chart = ({ c }: { c: { dim: string; title: string; data: any[]; color: (n: string) => string; label?: (n: string) => string } }) => <Card title={c.title} right={<span className="text-[10.5px] opacity-60">klik batang untuk detail</span>}><div style={{ height: c.data.length * 26 + 30 }}><ResponsiveContainer><BarChart layout="vertical" data={c.data} margin={{ top: 0, right: 56, left: 0, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="nama" width={140} {...AXIS} interval={0} tickFormatter={(n: string) => (c.label ? c.label(n) : n).slice(0, 22)} />
      <Tooltip formatter={(v: any) => [fmtNum(v) + ' MT', 'Volume']} labelFormatter={(n: any) => c.label ? c.label(n) : n} {...TIP} cursor={{ fill: 'rgba(128,140,160,.12)' }} />
      <RBar dataKey="vol" barSize={14} radius={[0, 8, 8, 0]} background={{ fill: 'rgba(128,140,160,.16)', radius: 8 } as any} cursor="pointer" onClick={(d: any) => pickBar(c, d.nama ?? d.payload?.nama)}>{c.data.map((d, i) => <Cell key={i} fill={c.color(d.nama)} stroke="rgba(100,116,139,.55)" strokeWidth={0.8} fillOpacity={f[c.dim] && f[c.dim] !== d.nama ? 0.25 : 1} />)}<LabelList dataKey="vol" position="right" fill="var(--text)" fontSize={10} formatter={(v: any) => fmtNum(v / 1000) + 'rb'} /></RBar></BarChart></ResponsiveContainer></div></Card>
  const TABS = [['ikhtisar', 'Ikhtisar', Layers], ['mitra', 'Mitra & Sumber', Handshake], ['pltu', 'PLTU & Wilayah', MapPinned], ['tabel', 'Tabel shipment', Table2]] as const
  const byKey = (d: string) => charts.find(c => c.dim === d)!
  return <>
    <PageHead icon={LayoutDashboard} color="#a78bfa" title="Dashboard Interaktif" sub="Klik kartu atau batang untuk popup detail; dari popup bisa menyaring semua grafik. Arahkan kursor untuk melihat angka." right={Object.keys(f).length > 0 && <button className="fchip" style={{ ['--c' as any]: '#94a3b8' }} onClick={() => setF({})}>Reset semua</button>} />
    <div className="dtabs" role="tablist">{TABS.map(([k, l, I]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><I size={15} />{l}</button>)}</div>
    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">{Object.entries(f).map(([k, v]) => <button key={k} onClick={() => flip(k, v)} className="fchip on" style={{ ['--c' as any]: '#a78bfa' }}>{k === 'status' ? stageLabel(v) : k === 'konf' ? KONF[v] : v} <X size={12} /></button>)}{Object.keys(f).length === 0 && <span className="text-[11px] text-slate-500 self-center">Belum ada penyaring aktif — ini tampilan semua shipment {bulanAktif}.</span>}</div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 mb-3">
      <StatTile icon={Ship} label="Shipment" value={rows.length} share={ships.length ? rows.length / ships.length * 100 : null} shareLabel="dari semua shipment bulan ini" color="#a78bfa" onClick={kpi('Shipment', '#a78bfa', fmtNum(rows.length))} />
      <StatTile icon={Boxes} label="Volume" unit=" MT" value={vol} share={ships.length ? vol / Math.max(1, ships.reduce((a, s) => a + (s.volume ?? 0), 0)) * 100 : null} shareLabel="dari total volume" color="#34d399" onClick={kpi('Volume', '#34d399', fmtNum(vol) + ' MT')} />
      <StatTile icon={Building2} label="PLTU tujuan" value={new Set(rows.map(s => s.pltu)).size} share={null} shareLabel="PLTU berbeda" color="#38bdf8" onClick={kpi('PLTU tujuan', '#38bdf8', fmtNum(new Set(rows.map(s => s.pltu)).size))} />
      <StatTile icon={Users} label="Mitra" value={new Set(rows.map(s => s.mitra ?? '—')).size} share={null} shareLabel="mitra berbeda" color="#f472b6" onClick={kpi('Mitra', '#f472b6', fmtNum(new Set(rows.map(s => s.mitra ?? '—')).size))} /></div>
    {tab === 'ikhtisar' && <div className="grid lg:grid-cols-2 gap-3">
      <Chart c={byKey('wilayah')} /><Chart c={byKey('konf')} />
      <Card title="Komposisi Tahapan" right={<span className="text-[10.5px] opacity-60">klik irisan</span>}><div style={{ height: 270 }}><ResponsiveContainer><PieChart><Pie data={pie} dataKey="vol" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="none" cursor="pointer" onClick={(d: any) => pickBar({ dim: 'status', title: 'Volume per Tahapan', label: n => n === 'tanpa' ? 'Tanpa status' : stageLabel(n) }, d.nama ?? d.payload?.nama)}>{pie.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={f.status && f.status !== d.nama ? 0.25 : 1} />)}</Pie><Tooltip formatter={(v: any) => [fmtNum(v) + ' MT', 'Volume']} {...TIP} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></Card>
      <Chart c={byKey('status')} /></div>}
    {tab === 'mitra' && <div className="grid lg:grid-cols-2 gap-3"><Chart c={byKey('mitra')} /><Chart c={byKey('sumber')} /></div>}
    {tab === 'pltu' && <div className="grid lg:grid-cols-2 gap-3"><Chart c={byPltu} /><Card title="Wilayah × Tahapan (volume, ribu MT)" right={<span className="text-[10.5px] opacity-60">arahkan kursor</span>}><div style={{ height: 330 }}><ResponsiveContainer><BarChart data={stack} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}><XAxis dataKey="wil" {...AXIS} interval={0} fontSize={10} /><YAxis {...AXIS} tickFormatter={(v: number) => fmtNum(v / 1000)} /><Tooltip {...TIP} formatter={(v: any, n: any) => [fmtNum(v) + ' MT', stageLabel(String(n))]} />{STATUSES.filter(x => x.key !== 'carryOver').map(x => <RBar key={x.key} dataKey={x.key} stackId="a" fill={x.color} />)}<Legend formatter={(v: any) => stageLabel(String(v))} wrapperStyle={{ fontSize: 11 }} /></BarChart></ResponsiveContainer></div></Card><Chart c={byKey('wilayah')} /></div>}
    {tab === 'tabel' && <Card title={`Shipment terpilih (${rows.length})`}><DataTable rows={rows} cols={cols} name="dashboard-shipment" /></Card>}
  </>
}
