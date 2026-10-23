import { useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { Bar, Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, STATUSES, stageLabel } from '../domain/status'
import { sum, pct, attention, kebutuhan, plantActual, KPI_DEFS } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
const scols: Col[] = [{ key: 'id', label: 'Shipment' }, { key: 'pltu', label: 'PLTU' }, { key: 'mitra', label: 'Mitra' }, { key: 'kapal', label: 'TB/BG' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
export default function Ringkasan() {
  const { kinds, monthly, bulanAktif, threshold } = useStore(); const [reg, setReg] = useState(''); const [st, setSt] = useState(''); const [pl, setPl] = useState('')
  const all = kinds.plant?.rows; if (!monthly || !all || !kinds.shipment) return <Empty />
  const plants = all.filter(p => !reg || p.wilayah === reg); const ships = kinds.shipment.rows.filter(s => !reg || s.wilayah === reg)
  const target = sum(plants, 'target'), co = sum(plants, 'carryOver'), keb = target + co, bl = sum(plants, 'bl'), ds = sum(plants, 'ds'), P = pct(ds, keb)
  const pipe = STATUSES.filter(s => s.key !== 'carryOver').map(s => { const x = ships.filter(h => h.status === s.key); return { ...s, n: x.length, vol: sum(x, 'volume') } })
  const regs = REGIONS.map(r => { const x = all.filter(p => p.wilayah === r); const t = sum(x, 'target'), c = sum(x, 'carryOver'), u = sum(x, 'ds'); return { r, t, c, u, p: pct(u, t + c), n: sum(x, 'n') } })
  const top = [...plants].filter(p => kebutuhan(p) > 0).sort((a, b) => kebutuhan(b) - kebutuhan(a)).slice(0, 12).map(p => ({ pltu: p.pltu, keb: kebutuhan(p), ds: plantActual(p), p: pct(plantActual(p), kebutuhan(p)) }))
  const att = attention(plants.filter(p => p.wilayah), threshold).slice(0, 8); const list = ships.filter(s => (!st || s.status === st) && (!pl || s.pltu === pl))
  const chip = (on: boolean, c: string) => ({ borderColor: c, background: on ? c : 'transparent', color: on ? '#15130d' : c })
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">Ringkasan Pasokan — {bulanAktif} 2026</h2><p className="text-[11px] text-slate-500">Sumber: {kinds.plant.source} · diperbarui {kinds.plant.at} · klik wilayah, tahapan, atau batang grafik untuk menyaring</p></div>
    <div className="flex flex-wrap gap-1.5 mb-3">{[{ r: '', c: '#9aa3b2' }, ...REGIONS.map(r => ({ r, c: REGION_COLOR[r] }))].map(g => <button key={g.r} onClick={() => { setReg(reg === g.r ? '' : g.r); setPl('') }} className="rounded-full border px-3 py-1 text-xs" style={chip(reg === g.r, g.c)}>{g.r || 'Semua wilayah'}</button>)}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
      <Kpi label="Konfirmasi Bulan Ini" value={fmtNum(target)} unit="MT" accent="#e6b457" tip={KPI_DEFS.target} /><Kpi label="Carry Over" value={fmtNum(co)} unit="MT" accent="#fb7185" />
      <Kpi label="Kebutuhan (Konfirmasi + Carry Over)" value={fmtNum(keb)} unit="MT" accent="#a78bfa" /><Kpi label="Complete Loading (B/L)" value={fmtNum(bl)} unit="MT" note={`${fmtPct(pct(bl, keb))} dari kebutuhan`} accent="#38bdf8" />
      <Kpi label="Complete Unloading (D/S)" value={fmtNum(ds)} unit="MT" note={`${fmtPct(pct(ds, keb))} dari kebutuhan`} accent="#34d399" />
      <div title={KPI_DEFS.pemenuhan} className="rounded-xl border border-white/10 bg-[#171a21] p-3" style={{ borderTop: `2px solid ${tone(P)}` }}><div className="text-[11px] text-slate-400">Persentase Pemenuhan</div><div className="text-lg font-bold num" style={{ color: tone(P) }}>{fmtPct(P)}</div><Bar pct={P} color={tone(P)} /></div></div>
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">{pipe.map(s => <button key={s.key} onClick={() => setSt(st === s.key ? '' : s.key)} className="text-left rounded-xl border bg-[#171a21] p-2 hover:bg-white/5" style={{ borderColor: st === s.key ? s.color : 'rgba(255,255,255,.1)', borderLeft: `3px solid ${s.color}` }}>
      <div className="text-[11px] text-slate-400 leading-tight">{s.label}</div><div className="text-base font-bold num">{s.n} <span className="text-[10px] font-normal text-slate-400">shipment</span></div><div className="text-[11px] text-slate-400">{fmtNum(s.vol)} MT</div></button>)}</div>
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2"><Card title="Kebutuhan vs Unloading per PLTU (12 terbesar) — klik batang untuk melihat shipment">
        <div style={{ height: top.length * 30 + 40 }}><ResponsiveContainer><BarChart layout="vertical" data={top} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}><XAxis type="number" stroke="#9aa3b2" fontSize={10} tickFormatter={v => fmtNum(v / 1000) + 'rb'} /><YAxis type="category" dataKey="pltu" width={120} stroke="#9aa3b2" fontSize={11} interval={0} />
          <Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <RBar dataKey="keb" name="Kebutuhan" fill="#e6b457" barSize={9} onClick={(d: any) => setPl(pl === (d.pltu ?? d.payload?.pltu) ? '' : (d.pltu ?? d.payload?.pltu))}>{top.map((t, i) => <Cell key={i} fill="#e6b457" fillOpacity={pl && pl !== t.pltu ? 0.3 : 1} />)}</RBar>
          <RBar dataKey="ds" name="Unloading (D/S)" fill="#34d399" barSize={9} onClick={(d: any) => setPl(pl === (d.pltu ?? d.payload?.pltu) ? '' : (d.pltu ?? d.payload?.pltu))}>{top.map((t, i) => <Cell key={i} fill={tone(t.p)} fillOpacity={pl && pl !== t.pltu ? 0.3 : 1} />)}</RBar></BarChart></ResponsiveContainer></div></Card></div>
      <Card title="Komposisi Volume per Tahapan"><div style={{ height: 230 }}><ResponsiveContainer><PieChart><Pie data={pipe.filter(s => s.vol > 0)} dataKey="vol" nameKey="label" innerRadius="55%" outerRadius="88%" paddingAngle={2} onClick={(d: any) => setSt(st === (d.key ?? d.payload?.key) ? '' : (d.key ?? d.payload?.key))}>
        {pipe.filter(s => s.vol > 0).map(s => <Cell key={s.key} fill={s.color} fillOpacity={st && st !== s.key ? 0.3 : 1} stroke="none" />)}</Pie><Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} /></PieChart></ResponsiveContainer></div></Card></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">{regs.map(g => <button key={g.r} onClick={() => { setReg(reg === g.r ? '' : g.r); setPl('') }} className="text-left rounded-xl border bg-[#171a21] p-3 hover:bg-white/5" style={{ borderColor: reg === g.r ? REGION_COLOR[g.r] : 'rgba(255,255,255,.1)' }}>
      <div className="flex justify-between text-xs"><b style={{ color: REGION_COLOR[g.r] }}>{g.r}</b><span className="num font-semibold" style={{ color: tone(g.p) }}>{fmtPct(g.p)}</span></div><div className="my-1.5"><Bar pct={g.p} color={REGION_COLOR[g.r]} /></div>
      <div className="text-[11px] text-slate-400">Konfirmasi {fmtNum(g.t)} · CO {fmtNum(g.c)} · D/S {fmtNum(g.u)} MT · {g.n} shipment</div></button>)}</div>
    {(st || pl) && <Card title={`Shipment ${st ? stageLabel(st) : 'semua status'}${pl ? ' — ' + pl : ''}${reg ? ' — ' + reg : ''} (${list.length})`} right={<button className="text-xs text-[#e6b457]" onClick={() => { setSt(''); setPl('') }}>Hapus pilihan</button>}><DataTable rows={list} cols={scols} name="ringkasan-shipment" /></Card>}
    <Card title="PLTU Perlu Perhatian" right={<span className="text-[11px] text-slate-400">pemenuhan di bawah {threshold}% (ambang di Pengaturan)</span>}>
      {att.length === 0 ? <p className="text-xs">Tidak ada PLTU yang memenuhi aturan.</p> : <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">{att.map((r, i) => <button key={i} onClick={() => { setPl(r.pltu); setReg(r.wilayah) }} className="text-left"><div className="flex justify-between text-xs"><span>{r.pltu} <span className="text-[10px]" style={{ color: REGION_COLOR[r.wilayah] }}>{r.wilayah}</span></span><span style={{ color: tone(r.p) }}>{fmtPct(r.p)}</span></div><Bar pct={r.p} color={tone(r.p)} /></button>)}</div>}</Card>
    <p className="text-[11px] text-slate-500">{monthly.ships.length} shipment terbaca · {monthly.skipped} baris kosong dilewati · {monthly.ships.filter(s => !s.stage).length} shipment tanpa Status tidak masuk tahapan manapun · Σ B/L vs Subtotal sheet: selisih {fmtNum(sum(monthly.ships, 'bl') - monthly.sub.bl, 3)} MT · Σ D/S: selisih {fmtNum(sum(monthly.ships, 'ds') - monthly.sub.ds, 3)} MT.</p>
  </>
}
