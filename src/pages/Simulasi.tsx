import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock, Flag, RotateCcw, TriangleAlert } from 'lucide-react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { TIP } from '../components/chartTheme'
import { useStore } from '../store'
import { Card, Empty, PageHead } from '../components/ui'
import { MILESTONES, DAY, predict, probWithin, stepStatsFor, totals } from '../domain/simulasi'
import { STEPS } from '../domain/monthly'
import { todayRef } from '../domain/insight'
import { fmtNum } from '../domain/format'
const fd = (t: number | null) => t == null ? '—' : new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(t)
const fdl = (t: number) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(t)
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y))
export default function Simulasi() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const today = asOf ? Date.parse(asOf) : todayRef()
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  const [plant, setPlant] = useState(''); const [sumber, setSumber] = useState(''); const [jetty, setJetty] = useState('')
  const [dates, setDates] = useState<string[]>(Array(10).fill('')); const [target, setTarget] = useState(''); const [adj, setAdj] = useState<number[]>(Array(9).fill(0)); const [open, setOpen] = useState(false)
  const ships = all?.ships ?? []
  const plants = useMemo(() => uniq(ships.map(s => s.plant)), [ships])
  const scoped = useMemo(() => plant ? ships.filter(s => s.plant === plant) : ships, [ships, plant])
  const sumbers = useMemo(() => uniq(scoped.map(s => s.sumber)), [scoped]); const jetties = useMemo(() => uniq(scoped.map(s => s.jetty)), [scoped])
  const sel = useMemo(() => ({ plant: plant || undefined, sumber: sumber || undefined, jetty: jetty || undefined }), [plant, sumber, jetty])
  const stats = useMemo(() => stepStatsFor(ships, sel), [ships, sel])
  const known = useMemo(() => dates.map(d => d ? Date.parse(d) : null) as (number | null)[], [dates])
  const pred = useMemo(() => predict(known, stats, adj, today), [known, stats, adj, today])
  if (!all) return <Empty />
  let anchor = -1; known.forEach((v, i) => { if (v != null) anchor = i }); const first = known.findIndex(v => v != null)
  const tIdx = 6; const tpl = pred[tIdx]; const end = pred[9]
  const tgt = target ? Date.parse(target) : null
  const hist = anchor >= 0 && anchor < tIdx ? totals(ships, sel, anchor, tIdx) : null
  const margin = tgt != null && tpl.date != null ? Math.round((tgt - tpl.date) / DAY) : null
  const prob = tgt != null && hist && known[anchor] != null ? probWithin(hist.vals, (tgt - (known[anchor] as number)) / DAY) : null
  const bins = hist && hist.vals.length ? (() => { const mx = Math.ceil(Math.max(...hist.vals)); const w = Math.max(1, Math.ceil(mx / 14)); const out: { l: string; n: number; from: number }[] = []; for (let a = 0; a <= mx; a += w) out.push({ l: `${a}`, n: hist.vals.filter(v => v >= a && v < a + w).length, from: a }); return { out, w } })() : null
  const needDays = anchor >= 0 && tpl.date != null && known[anchor] != null ? (tpl.date - (known[anchor] as number)) / DAY : null
  const lowest = Math.min(...pred.map(p => p.lo ?? Infinity)), highest = Math.max(...pred.map(p => p.hi ?? -Infinity)); const span = isFinite(lowest) && isFinite(highest) && highest > lowest ? highest - lowest : DAY
  const X = (t: number) => ((t - lowest) / span) * 100
  const setD = (i: number, v: string) => setDates(d => d.map((x, k) => k === i ? v : x))
  const reset = () => { setDates(Array(10).fill('')); setAdj(Array(9).fill(0)); setTarget('') }
  const lowN = stats.slice(Math.max(anchor, 0), 9).some(s => s.n < 5)
  return <>
    <PageHead icon={CalendarClock} color="#22d3ee" title="Simulasi ETA Shipment" month={false} sub={<>Isi tanggal yang sudah diketahui atau yang kamu targetkan (mis. TA POL) — tahap sesudahnya diperkirakan maju, tahap sebelumnya (mis. tanggal SI terbit) dihitung mundur, pilih PLTU, jetty muat, dan sumber tambang — perkiraan tanggal tahap berikutnya dihitung dari durasi historis {fmtNum(ships.length)} shipment di sheet ALL Shipment.</>} />
    <div className="grid lg:grid-cols-5 gap-3">
      <div className="lg:col-span-2 grid gap-3 content-start">
        <Card title="1 · Rute & sumber">
          <div className="grid gap-2 text-xs">
            <label>PLTU tujuan<select className="w-full mt-1" value={plant} onChange={e => { setPlant(e.target.value); setSumber(''); setJetty('') }}><option value="">Semua PLTU</option>{plants.map(p => <option key={p}>{p}</option>)}</select></label>
            <label>Rute — jetty / pelabuhan muat<select className="w-full mt-1" value={jetty} onChange={e => setJetty(e.target.value)}><option value="">Semua jetty{plant ? ` (ke ${plant})` : ''}</option>{jetties.map(j => <option key={j}>{j}</option>)}</select></label>
            <label>Sumber tambang<select className="w-full mt-1" value={sumber} onChange={e => setSumber(e.target.value)}><option value="">Semua sumber</option>{sumbers.map(j => <option key={j}>{j}</option>)}</select></label></div></Card>
        <Card title="2 · Tanggal yang sudah diketahui" right={<div className="flex gap-2 text-[11px]"><button className="text-[#f2c76b]" onClick={() => setD(1, iso(today))}>Kapal tiba hari ini</button><button className="text-slate-400 flex items-center gap-1" onClick={reset}><RotateCcw size={11} />Reset</button></div>}>
          <div className="grid gap-1.5">{MILESTONES.map((m, i) => <label key={m} className="grid grid-cols-[1fr_150px] items-center gap-2 text-xs"><span className={known[i] != null ? 'font-semibold' : 'text-slate-300'}>{i + 1}. {m}</span><input type="date" value={dates[i]} onChange={e => setD(i, e.target.value)} aria-label={m} /></label>)}</div>
          <p className="text-[11px] text-slate-500 mt-2">Cukup isi satu atau beberapa tanggal. Tahap sesudahnya diperkirakan maju dari tanggal terakhir yang diisi; tahap sebelumnya (mis. tanggal SI terbit) dihitung mundur dari tanggal pertama yang diisi.</p></Card>
        <Card title="3 · Target & skenario (opsional)">
          <label className="grid grid-cols-[1fr_150px] items-center gap-2 text-xs mb-2"><span>Target tiba di PLTU (Tgl. Rakor)</span><input type="date" value={target} onChange={e => setTarget(e.target.value)} aria-label="Target tiba di PLTU" /></label>
          <button className="text-xs text-[#f2c76b]" onClick={() => setOpen(!open)}>{open ? 'Sembunyikan' : 'Tampilkan'} skenario tambahan hari per tahap</button>
          {open && <div className="grid gap-1.5 mt-2">{STEPS.map((s, i) => <label key={s} className="grid grid-cols-[1fr_90px] items-center gap-2 text-[11.5px]"><span className="text-slate-300">{s}{stats[i].med != null ? <em className="text-slate-500 not-italic"> · biasa {fmtNum(stats[i].med, 1)} hr</em> : null}</span><input type="number" step={0.5} min={-5} max={30} value={adj[i]} onChange={e => setAdj(a => a.map((x, k) => k === i ? +e.target.value || 0 : x))} aria-label={`Tambahan hari ${s}`} /></label>)}<p className="text-[10.5px] text-slate-500">Contoh: cuaca buruk → tambah hari di "Pelayaran"; antrean sandar → tambah di "TA PLTU → Sandar bongkar".</p></div>}</Card></div>
      <div className="lg:col-span-3 grid gap-3 content-start lg:sticky lg:top-3 self-start">
        {anchor < 0 ? <Card><div className="sim-empty"><Clock className="mx-auto mb-2 text-[#22d3ee]" size={30} /><p className="text-sm font-bold">Mulai dari satu tanggal saja</p><p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Pilih titik awal cepat di bawah, atau isi tanggal manual di panel kiri. Estimasi tiba di PLTU dan rentang cepat–lambat langsung muncul.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">{[[1, 'Kapal tiba hari ini'], [3, 'Mulai muat hari ini'], [5, 'Berlayar hari ini'], [6, 'Tiba di PLTU hari ini']].map(([k, l]) => <button key={k as number} className="pbtn" data-tip={`Isi "${MILESTONES[k as number]}" dengan tanggal hari ini`} onClick={() => setD(k as number, iso(today))}>{l}</button>)}</div>
            <div className="sim-steps"><span><b>1</b>Rute &amp; sumber</span><span><b>2</b>Tanggal diketahui</span><span><b>3</b>Target &amp; skenario</span></div></div></Card> : <>
          <section className="hero" style={{ ['--hc' as any]: '#22d3ee' }}>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{known[tIdx] != null ? 'Sudah tiba di PLTU' : 'Estimasi tiba di PLTU'}</div>
            {tpl.date != null ? <><div className="text-2xl font-extrabold mt-1">{fdl(tpl.date)}</div>
              {known[tIdx] == null && <div className="text-xs text-slate-300 mt-1">Rentang cepat–lambat: <b>{fd(tpl.lo)}</b> s.d. <b>{fd(tpl.hi)}</b>{needDays != null ? <> · ± {fmtNum(needDays, 1)} hari sejak {MILESTONES[anchor].toLowerCase()}</> : null}</div>}
              {end.date != null && known[9] == null && <div className="text-xs text-slate-400 mt-1">Perkiraan selesai bongkar: {fd(end.date)} (rentang {fd(end.lo)} – {fd(end.hi)})</div>}</> : <div className="text-sm text-amber-300 mt-1">Belum cukup data historis untuk tahap berikutnya pada pilihan ini.</div>}
            {pred.some(p => p.tertahan) && <p className="text-xs text-amber-300 mt-2 flex gap-1.5"><TriangleAlert size={14} className="shrink-0 mt-0.5" />Tahap setelah {MILESTONES[anchor].toLowerCase()} sudah melewati durasi biasanya — kemungkinan tertunda, perkiraan dihitung dari hari ini.</p>}
            {first > 0 && pred[0].date != null && known[0] == null && <div className="mt-3 rounded-xl p-3 border border-violet-400/40 bg-violet-400/10"><div className="text-xs font-bold">⟲ Perhitungan mundur — agar {MILESTONES[first].toLowerCase()} jatuh pada {fd(known[first])}</div><div className="text-xs text-slate-200 mt-1">SI sebaiknya terbit sekitar <b>{fd(pred[0].date)}</b> (rentang {fd(pred[0].lo)} – {fd(pred[0].hi)}).{pred.slice(1, first).filter(x => x.date != null && !x.known).length ? ' Milestone lain sebelum tanggal itu bisa dilihat di daftar bawah.' : ''}</div></div>}
            {tgt != null && tpl.date != null && known[tIdx] == null && <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: margin! >= 0 ? 'rgba(52,211,153,.5)' : 'rgba(251,113,133,.5)', background: margin! >= 0 ? 'rgba(52,211,153,.08)' : 'rgba(251,113,133,.08)' }}>
              <div className="flex items-center gap-2 text-xs font-bold"><Flag size={14} />Target Rakor {fd(tgt)}: {margin! >= 0 ? `estimasi ${margin} hari lebih awal` : `estimasi terlambat ${-margin!} hari`}</div>
              {prob != null ? <div className="text-xs text-slate-300 mt-1">Berdasarkan {hist!.vals.length} shipment serupa ({hist!.scope}), peluang tiba paling lambat di target ≈ <b>{Math.round(prob * 100)}%</b>.</div> : <div className="text-xs text-slate-400 mt-1">Sampel historis belum cukup (&lt; 8) untuk menghitung peluang.</div>}</div>}
            {lowN && <p className="text-[11px] text-slate-500 mt-2">Sebagian tahap memakai kurang dari {5} sampel pada pilihan ini, jadi dilebarkan ke cakupan lebih umum (lihat tabel di bawah).</p>}</section>
          <Card title="Perkiraan tiap milestone"><div className="grid gap-1.5">{pred.map((p, i) => { const st = i > 0 ? stats[i - 1] : null; return <div key={i} className="grid grid-cols-[22px_1fr_auto] gap-2 items-start py-1.5 border-b border-white/5 last:border-0">
            <div className="pt-0.5">{p.known ? <CheckCircle2 size={16} className="text-emerald-400" /> : p.date != null ? <Clock size={16} className={p.dir === 'mundur' ? 'text-[#a78bfa]' : 'text-[#22d3ee]'} /> : <span className="inline-block w-4 text-center text-slate-600">·</span>}</div>
            <div className="min-w-0"><div className={'text-[12.5px] ' + (p.known ? 'font-semibold' : '')}>{MILESTONES[i]}</div>
              {!p.known && p.date != null && p.dir === 'mundur' && <div className="text-[10.5px] text-slate-500">⟲ dihitung mundur: {fmtNum(Math.max(0, (stats[i].med ?? 0) + (adj[i] ?? 0)), 1)} hari sebelum {MILESTONES[i + 1].toLowerCase()} · {stats[i].n} sampel ({stats[i].scope})</div>}
              {!p.known && p.date != null && p.dir === 'isi' && <div className="text-[10.5px] text-slate-500">diisi otomatis di antara dua tanggal yang kamu isi, sebanding durasi biasanya</div>}
              {!p.known && p.date != null && p.dir === 'maju' && st && <div className="text-[10.5px] text-slate-500">+{fmtNum(Math.max(0, (st.med ?? 0) + (adj[i - 1] ?? 0)), 1)} hari dari tahap sebelumnya · {st.n} sampel ({st.scope})</div>}
              {p.date != null && <div className="relative h-1.5 rounded-full bg-white/10 mt-1.5"><i className="absolute top-0 h-full rounded-full" style={{ left: X(p.lo as number) + '%', width: Math.max(1.2, X(p.hi as number) - X(p.lo as number)) + '%', background: p.known ? '#34d399' : 'linear-gradient(90deg,#22d3ee55,#22d3ee)' }} /></div>}</div>
            <div className="text-right text-[12.5px] num"><b>{fd(p.date)}</b>{!p.known && p.date != null && <div className="text-[10.5px] text-slate-500">{fd(p.lo)} – {fd(p.hi)}</div>}</div></div> })}</div></Card>
          {bins && hist && hist.vals.length >= 3 && <Card title={`Sebaran durasi historis: ${MILESTONES[anchor]} → TA PLTU`} right={<span className="text-[11px] text-slate-400">{hist.vals.length} shipment · {hist.scope}</span>}>
            <div style={{ height: 170 }}><ResponsiveContainer><BarChart data={bins.out}><XAxis dataKey="l" stroke="#9aa3b2" fontSize={10} label={{ value: 'hari', position: 'insideBottomRight', offset: -2, fill: '#9aa3b2', fontSize: 10 }} /><YAxis allowDecimals={false} stroke="#9aa3b2" fontSize={10} /><Tooltip formatter={(v: any) => [v + ' shipment', 'Jumlah']} labelFormatter={l => `${l}–${+l + bins.w} hari`} {...TIP} />
              <RBar dataKey="n" radius={[6, 6, 0, 0]}>{bins.out.map((b, i) => <Cell key={i} fill={needDays != null && needDays >= b.from && needDays < b.from + bins.w ? '#22d3ee' : '#6366f1'} />)}</RBar>{needDays != null && <ReferenceLine x={`${bins.out.find(b => needDays >= b.from && needDays < b.from + bins.w)?.l ?? ''}`} stroke="#22d3ee" />}</BarChart></ResponsiveContainer></div>
            <p className="text-[11px] text-slate-500">Batang biru muda = kelompok durasi tempat estimasi ini berada.</p></Card>}
          <Card title="Dasar perhitungan per tahap"><div className="overflow-x-auto"><table className="w-full text-[11.5px]"><thead><tr className="text-left text-slate-400"><th>Tahap</th><th>Cepat (P25)</th><th>Biasa (median)</th><th>Lambat (P75)</th><th>Sampel</th><th>Cakupan data</th></tr></thead><tbody>{STEPS.map((s, i) => <tr key={s} className={'border-t border-white/5' + (i >= anchor ? '' : ' opacity-50')}><td>{s}</td><td>{stats[i].p25 == null ? '—' : fmtNum(stats[i].p25, 1)}</td><td>{stats[i].med == null ? '—' : fmtNum(stats[i].med, 1)}</td><td>{stats[i].p75 == null ? '—' : fmtNum(stats[i].p75, 1)}</td><td>{stats[i].n}</td><td className="text-slate-400">{stats[i].scope}</td></tr>)}</tbody></table></div>
            <p className="text-[10.5px] text-slate-500 mt-2">Satuan hari. Perkiraan memakai median; rentang memakai sebaran kuartil (tahap dianggap saling bebas). Ini estimasi statistik dari riwayat, bukan jaminan jadwal — cuaca, antrean, dan kendala lain tidak terbaca kecuali kamu menambahkannya di skenario.</p></Card></>}
      </div></div>
  </>
}
