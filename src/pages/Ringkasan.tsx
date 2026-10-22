import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { Bar, Card, Empty, Kpi } from '../components/ui'
import { REGIONS, STATUSES } from '../domain/status'
import { sum, pct, attention, KPI_DEFS } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
export const tone = (p: number | null) => p == null ? '#6b7280' : p >= 85 ? '#34d399' : p >= 60 ? '#fbbf24' : '#fb7185'
export default function Ringkasan() {
  const { kinds, monthly, bulanAktif, threshold } = useStore(); const plants = kinds.plant?.rows
  if (!monthly || !plants) return <Empty />
  const ships = monthly.ships
  const target = sum(plants, 'target'), co = sum(plants, 'carryOver'), keb = target + co
  const bl = ships.reduce((a, s) => a + (s.bl ?? 0), 0), ds = ships.reduce((a, s) => a + (s.ds ?? 0), 0)
  const pipe = STATUSES.filter(s => s.key !== 'carryOver').map(s => { const x = ships.filter(h => h.stage === s.key); return { ...s, n: x.length, vol: x.reduce((a, h) => a + h.vol, 0) } })
  const reg = REGIONS.map(r => { const x = plants.filter(p => p.wilayah === r); const t = sum(x, 'target'), c = sum(x, 'carryOver'), u = sum(x, 'unloading'); return { r, t, c, u, p: pct(u, t + c), n: x.reduce((a, p) => a + p.n, 0) } })
  const att = attention(plants.filter(p => p.wilayah), threshold).slice(0, 8)
  const unmapped = ships.filter(s => !s.stage).length
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">Ringkasan Pasokan — {bulanAktif} 2026</h2><p className="text-[11px] text-slate-500">Sumber: {kinds.plant.source} · diperbarui {kinds.plant.at}</p></div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
      <Kpi label="Konfirmasi Bulan Ini" value={fmtNum(target)} unit="MT" accent="#e6b457" tip={KPI_DEFS.target} />
      <Kpi label="Carry Over" value={fmtNum(co)} unit="MT" accent="#fb7185" />
      <Kpi label="Kebutuhan (Konfirmasi + Carry Over)" value={fmtNum(keb)} unit="MT" accent="#a78bfa" />
      <Kpi label="Complete Loading (B/L)" value={fmtNum(bl)} unit="MT" note={`${fmtPct(pct(bl, keb))} dari kebutuhan`} accent="#38bdf8" />
      <Kpi label="Complete Unloading (D/S)" value={fmtNum(ds)} unit="MT" note={`${fmtPct(pct(ds, keb))} dari kebutuhan`} accent="#34d399" />
      <Kpi label="Persentase Pemenuhan" value={fmtPct(pct(ds, keb))} note="Unloading ÷ Kebutuhan" accent={tone(pct(ds, keb))} tip={KPI_DEFS.pemenuhan} />
    </div>
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">{pipe.map(s => <div key={s.key} className="rounded-xl border border-white/10 bg-[#171a21] p-2" style={{ borderLeft: `3px solid ${s.color}` }}><div className="text-[11px] text-slate-400 leading-tight">{s.label}</div><div className="text-base font-bold num">{s.n} <span className="text-[10px] font-normal text-slate-400">shipment</span></div><div className="text-[11px] text-slate-400">{fmtNum(s.vol)} MT</div></div>)}</div>
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-2 content-start mb-3">{reg.map(g => <Link key={g.r} to="/laporan/harian" className="rounded-xl border border-white/10 bg-[#171a21] p-3 hover:bg-white/5 block"><div className="flex justify-between text-xs"><b style={{ color: REGION_COLOR[g.r] }}>{g.r}</b><span className="num font-semibold" style={{ color: tone(g.p) }}>{fmtPct(g.p)}</span></div>
        <div className="my-1.5"><Bar pct={g.p} color={REGION_COLOR[g.r]} /></div><div className="text-[11px] text-slate-400">Konfirmasi {fmtNum(g.t)} · CO {fmtNum(g.c)} · Unloading {fmtNum(g.u)} MT · {g.n} shipment</div></Link>)}</div>
      <Card title="Komposisi Volume per Tahapan"><div style={{ height: 210 }}><ResponsiveContainer><PieChart><Pie data={pipe.filter(s => s.vol > 0)} dataKey="vol" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>{pipe.filter(s => s.vol > 0).map(s => <Cell key={s.key} fill={s.color} stroke="none" />)}</Pie><Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} /></PieChart></ResponsiveContainer></div></Card></div>
    <Card title="PLTU Perlu Perhatian" right={<Link className="text-xs text-[#e6b457]" to="/pltu">Lihat Detail</Link>}>
      <p className="text-[11px] text-slate-400 mb-1">Aturan: pemenuhan di bawah {threshold}% dengan kebutuhan &gt; 0 (ambang di Pengaturan).</p>
      {att.length === 0 ? <p className="text-xs">Tidak ada PLTU yang memenuhi aturan.</p> : <table className="w-full text-xs"><thead><tr><th>PLTU</th><th>Wilayah</th><th>Kebutuhan (MT)</th><th>Unloading (MT)</th><th>Pemenuhan</th></tr></thead><tbody>{att.map((r, i) => <tr key={i} className="border-t border-white/5"><td>{r.pltu}</td><td>{r.wilayah}</td><td>{fmtNum(r.target + r.carryOver)}</td><td>{fmtNum(r.unloading)}</td><td style={{ color: tone(r.p) }}>{fmtPct(r.p)}</td></tr>)}</tbody></table>}</Card>
    <p className="text-[11px] text-slate-500">Kualitas data: {ships.length} shipment terbaca, {monthly.skipped} baris kosong/tanpa volume dilewati, {unmapped} shipment tanpa Status tidak masuk tahapan manapun. Σ B/L vs Subtotal sheet: selisih {fmtNum(bl - monthly.sub.bl, 3)} MT; Σ D/S: selisih {fmtNum(ds - monthly.sub.ds, 3)} MT.</p>
  </>
}
