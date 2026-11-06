import { useState } from 'react'
import { ArrowRight, CalendarCheck, History, Target, Ship, PackageCheck } from 'lucide-react'
import { Gauge, Layer, useCountUp, Donut, StatTile } from '../components/Anim'
import { useStore } from '../store'
import { Bar, Card, Empty, Kpi, RegionChip } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, STATUSES, stageLabel } from '../domain/status'
import { sum, pct, attention, kebutuhan, plantActual, KPI_DEFS } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { REGION_COLOR } from '../config/regions'
import { tone } from '../domain/view'
const scols: Col[] = [{ key: 'id', label: 'Shipment' }, { key: 'pltu', label: 'PLTU' }, { key: 'mitra', label: 'Mitra' }, { key: 'kapal', label: 'TB/BG' }, { key: 'volume', label: 'Volume (MT)', fmt: v => fmtNum(v) }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
function Count({ label, v, c }: { label: string; v: number; c: string }) { const n = useCountUp(v); return <div className="rcount" style={{ borderColor: c + '55' }}><div className="text-[10px] text-slate-400 leading-tight">{label}</div><div className="num font-bold" style={{ color: c }}>{fmtNum(Math.round(n))}<span className="text-[10px] font-normal text-slate-400"> MT</span></div></div> }
export default function Ringkasan() {
  const { kinds, monthly, bulanAktif, threshold } = useStore(); const [reg, setReg] = useState(''); const [st, setSt] = useState(''); const [pl, setPl] = useState('')
  const all = kinds.plant?.rows; if (!monthly || !all || !kinds.shipment) return <Empty />
  const plants = all.filter(p => !reg || p.wilayah === reg); const ships = kinds.shipment.rows.filter(s => !reg || s.wilayah === reg)
  const target = sum(plants, 'target'), co = sum(plants, 'carryOver'), keb = target + co, bl = sum(plants, 'bl'), ds = sum(plants, 'ds'), P = pct(ds, keb)
  const pipe = STATUSES.filter(s => s.key !== 'carryOver').map(s => { const x = ships.filter(h => h.status === s.key); return { ...s, n: x.length, vol: sum(x, 'volume') } })
  const regs = REGIONS.map(r => { const x = all.filter(p => p.wilayah === r); const t = sum(x, 'target'), c = sum(x, 'carryOver'), u = sum(x, 'ds'); return { r, t, c, u, p: pct(u, t + c), n: sum(x, 'n') } })
  const top = [...plants].filter(p => kebutuhan(p) > 0).sort((a, b) => kebutuhan(b) - kebutuhan(a)).slice(0, 12).map(p => ({ pltu: p.pltu, wilayah: p.wilayah, keb: kebutuhan(p), bl: p.bl ?? 0, ds: plantActual(p), p: pct(plantActual(p), kebutuhan(p)) })), maxKeb = Math.max(1, ...top.map(t => t.keb)), maxPipe = Math.max(1, ...pipe.map(s => s.vol))
  const att = attention(plants.filter(p => p.wilayah), threshold).slice(0, 8); const list = ships.filter(s => (!st || s.status === st) && (!pl || s.pltu === pl))
  const chip = (on: boolean, c: string) => ({ borderColor: c, background: on ? c : 'transparent', color: on ? '#15130d' : c })
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">Ringkasan Pasokan — {bulanAktif} 2026</h2><p className="text-[11px] text-slate-500">Sumber: {kinds.plant.source} · diperbarui {kinds.plant.at} · klik wilayah, tahapan, atau batang grafik untuk menyaring</p></div>
    <div className="chips flex flex-wrap gap-1.5 mb-3">{[{ r: '', c: undefined as string | undefined }, ...REGIONS.map(r => ({ r, c: REGION_COLOR[r] as string | undefined }))].map(g => <RegionChip key={g.r} label={g.r || 'Semua wilayah'} color={g.c} on={reg === g.r} onClick={() => { setReg(reg === g.r ? '' : g.r); setPl('') }} />)}</div>
    <section className="rhero mb-3"><div className="rhero-g"><Gauge value={P} color={tone(P)} label="Pemenuhan" /></div>
      <div className="rhero-r"><div className="rhero-t">Kebutuhan {bulanAktif} <b className="num">{fmtNum(keb)}</b> MT</div>
        <div className="lay lay-big" role="img" aria-label="Kebutuhan, sudah muat, dan sudah bongkar"><i className="lay-bl" style={{ width: Math.min(100, pct(bl, keb) ?? 0) + '%' }} /><i className="lay-ds" style={{ width: Math.min(100, P ?? 0) + '%', background: `linear-gradient(90deg,${tone(P)}99,${tone(P)})`, boxShadow: `0 0 16px ${tone(P)}88` }} /></div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 mt-2"><span><i className="lg lg-t" />Kebutuhan = 100%</span><span><i className="lg lg-bl" />Sudah muat (B/L) {fmtPct(pct(bl, keb))}</span><span><i className="lg" style={{ background: tone(P) }} />Sudah bongkar (D/S) {fmtPct(P)}</span></div>
        <div className="grid grid-cols-3 gap-2 mt-3">{[['Sisa belum dipenuhi', Math.max(0, keb - ds), '#60a5fa'], ['Sudah dibongkar', ds, '#34d399'], ['Sudah dimuat (B/L)', bl, '#a78bfa']].map(([l, v, c]) => <Count key={l as string} label={l as string} v={v as number} c={c as string} />)}</div></div></section>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 mb-3">
      <StatTile icon={CalendarCheck} label="Konfirmasi Bulan Ini" value={target} unit=" MT" share={pct(target, keb)} shareLabel="dari kebutuhan" color="#e6b457" tip={KPI_DEFS.target} />
      <StatTile icon={History} label="Carry Over" value={co} unit=" MT" share={pct(co, keb)} shareLabel="dari kebutuhan" color="#f87171" />
      <StatTile icon={Target} label="Kebutuhan (Konfirmasi + Carry Over)" value={keb} unit=" MT" share={keb ? 100 : null} shareLabel="total target pasokan" color="#a78bfa" />
      <StatTile icon={Ship} label="Complete Loading (B/L)" value={bl} unit=" MT" share={pct(bl, keb)} shareLabel="dari kebutuhan sudah dimuat" color="#38bdf8" />
      <StatTile icon={PackageCheck} label="Complete Unloading (D/S)" value={ds} unit=" MT" share={P} shareLabel="dari kebutuhan terpenuhi" color="#34d399" /></div>
    <div className="pipe mb-3">{pipe.map((s2, i) => <div key={s2.key} className="pipe-cell">{i > 0 && <ArrowRight size={14} className="pipe-ar" />}<button onClick={() => setSt(st === s2.key ? '' : s2.key)} className="pipe-b text-left" style={{ ['--c' as any]: s2.color, borderColor: st === s2.key ? s2.color : undefined }} aria-pressed={st === s2.key}>
      <div className="text-[11px] text-slate-300 leading-tight">{s2.label}</div><div className="text-xl font-bold num">{s2.n} <span className="text-[10px] font-normal text-slate-400">shipment</span></div><div className="text-[11px] text-slate-400">{fmtNum(s2.vol)} MT</div><div className="pipe-bar"><i style={{ width: (s2.vol / maxPipe) * 100 + '%' }} /></div></button></div>)}</div>
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2"><Card title="Kebutuhan vs Unloading per PLTU (12 terbesar) — klik batang untuk melihat shipment">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 mb-2"><span><i className="lg lg-t" />Kebutuhan (panjang lintasan)</span><span><i className="lg lg-bl" />Sudah muat (B/L)</span><span><i className="lg" style={{ background: '#34d399' }} />Sudah bongkar (D/S) = terpenuhi</span><span className="text-slate-500">warna isi: <b style={{ color: '#34d399' }}>≥85%</b> · <b style={{ color: '#22d3ee' }}>60–85%</b> · <b style={{ color: '#60a5fa' }}>&lt;60%</b></span></div>
        <ul className="lrows">{top.map(t => <li key={t.pltu}><button className={'lrow ' + (pl === t.pltu ? 'on' : '')} onClick={() => setPl(pl === t.pltu ? '' : t.pltu)} aria-pressed={pl === t.pltu} title={`Kebutuhan ${fmtNum(t.keb)} MT · B/L ${fmtNum(t.bl)} MT · D/S ${fmtNum(t.ds)} MT`}>
          <span className="lrow-n truncate"><i style={{ background: REGION_COLOR[t.wilayah] }} />{t.pltu}</span><span className="lrow-b"><Layer keb={t.keb} bl={t.bl} ds={t.ds} scale={maxKeb} color={tone(t.p)} dim={!!pl && pl !== t.pltu} /></span>
          <span className="lrow-v num"><b style={{ color: tone(t.p) }}>{fmtPct(t.p)}</b><small>{fmtNum(t.ds)} / {fmtNum(t.keb)} MT</small></span></button></li>)}</ul>
        </Card></div>
      <Card title="Komposisi Volume per Tahapan"><Donut data={pipe} active={st} onPick={k => setSt(st === k ? '' : k)} fmt={fmtNum} /></Card></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">{regs.map(g => <button key={g.r} onClick={() => { setReg(reg === g.r ? '' : g.r); setPl('') }} className="text-left rounded-xl border bg-[#171a21] p-3 hover:bg-white/5" style={{ borderColor: reg === g.r ? REGION_COLOR[g.r] : 'rgba(255,255,255,.1)' }}>
      <div className="flex justify-between text-xs"><b className="inline-flex items-center gap-1.5"><i style={{ width: 8, height: 8, borderRadius: 99, background: REGION_COLOR[g.r] }} />{g.r}</b><span className="num font-semibold" style={{ color: tone(g.p) }}>{fmtPct(g.p)}</span></div><div className="my-1.5"><Bar pct={g.p} color={tone(g.p)} /></div>
      <div className="text-[11px] text-slate-400">Konfirmasi {fmtNum(g.t)} · CO {fmtNum(g.c)} · D/S {fmtNum(g.u)} MT · {g.n} shipment</div></button>)}</div>
    {(st || pl) && <Card title={`Shipment ${st ? stageLabel(st) : 'semua status'}${pl ? ' — ' + pl : ''}${reg ? ' — ' + reg : ''} (${list.length})`} right={<button className="text-xs text-[#e6b457]" onClick={() => { setSt(''); setPl('') }}>Hapus pilihan</button>}><DataTable rows={list} cols={scols} name="ringkasan-shipment" /></Card>}
    <Card title="PLTU Perlu Perhatian" right={<span className="text-[11px] text-slate-400">pemenuhan di bawah {threshold}% (ambang di Pengaturan)</span>}>
      {att.length === 0 ? <p className="text-xs">Tidak ada PLTU yang memenuhi aturan.</p> : <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">{att.map((r, i) => <button key={i} onClick={() => { setPl(r.pltu); setReg(r.wilayah) }} className="text-left"><div className="flex justify-between text-xs"><span>{r.pltu} <span className="text-[10px]" style={{ color: REGION_COLOR[r.wilayah] }}>{r.wilayah}</span></span><span style={{ color: tone(r.p) }}>{fmtPct(r.p)}</span></div><Bar pct={r.p} color={tone(r.p)} /></button>)}</div>}</Card>
    <p className="text-[11px] text-slate-500">{monthly.ships.length} shipment terbaca · {monthly.skipped} baris kosong dilewati · {monthly.ships.filter(s => !s.stage).length} shipment tanpa Status tidak masuk tahapan manapun · Σ B/L vs Subtotal sheet: selisih {fmtNum(sum(monthly.ships, 'bl') - monthly.sub.bl, 3)} MT · Σ D/S: selisih {fmtNum(sum(monthly.ships, 'ds') - monthly.sub.ds, 3)} MT.</p>
  </>
}
