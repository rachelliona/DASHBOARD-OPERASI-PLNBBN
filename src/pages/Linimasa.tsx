import { GitBranch } from 'lucide-react'
import { TIP } from '../components/chartTheme'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, STATUSES, stageLabel } from '../domain/status'
import { STEPS, pctl, regionOf, stepDays } from '../domain/monthly'
import { fmtNum } from '../domain/format'
import { analisis, CAUSE, SOLUSI } from '../domain/sebab'
import AnalisisBox from '../components/AnalisisBox'
import { useScope } from './useBulan'
const SHORT = ['SI → TA POL', 'TA POL → Sandar', 'Sandar → Muat', 'Durasi muat', 'Muat → Berlayar', 'Pelayaran', 'TA PLTU → Sandar', 'Sandar → Bongkar', 'Durasi bongkar']
const flat = (d: (number | null)[]) => Object.fromEntries(d.map((x, i) => ['s' + i, x]))
export default function Linimasa() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const sc = useScope(); const [reg, setReg] = useState(''); const [st, setSt] = useState(''); const [late, setLate] = useState(false); const [stg, setStg] = useState<number | null>(null); const [sel, setSel] = useState<any>(null)
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  const data = useMemo(() => {
    if (!all) return null
    const ships = sc.pick(all.ships); const rows = ships.map(s => { const d = stepDays(s.ms); const tot = s.ms[0] != null && s.ms[9] != null && s.ms[9] >= s.ms[0] ? (s.ms[9] - s.ms[0]) / 864e5 : null; return { id: s.id, pltu: s.plant, wilayah: regionOf(s.plant), si: s.si, kapal: s.tbbg.split(';')[0], mitra: s.mitraReal, status: s.stage, d, tot, ms: s.ms, note: s.note ?? '', ...flat(d) } }).filter(r => r.d.some(x => x != null))
    const stats = STEPS.map((_, i) => { const v = rows.map(r => r.d[i]).filter((x): x is number => x != null).sort((a, b) => a - b); return { n: v.length, med: pctl(v, 0.5), p75: pctl(v, 0.75) } })
    const w = new Date(Date.now() + 7 * 36e5), ref = Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()), refT = asOf ? Date.parse(asOf) : ref
    const over = STEPS.map((nama, i) => ({ i, nama, n: rows.filter(r => r.d[i] != null && stats[i].p75 != null && r.d[i]! > stats[i].p75!).length, tot: stats[i].n })).filter(x => x.n > 0).sort((a, b) => b.n - a.n)
    const withAn = rows.map(r => { const an = analisis(r.ms, r.d, stats, r.note, refT, null); const ada = an.slow.length > 0 || !!an.running || an.tags.length > 0; return { ...r, an, ada, masalah: ada ? an.masalah : null, solusi1: ada ? an.solusi.join(' ') : null } }); const worst = withAn.filter(r => r.an.slow.length || r.an.running).sort((a, b) => ((b.an.slow[0]?.over ?? 0) + (b.an.running ? 1 : 0)) - ((a.an.slow[0]?.over ?? 0) + (a.an.running ? 1 : 0))).slice(0, 5)
    const neg = ships.filter(s => stepDays(s.ms).some((x, i) => x == null && s.ms[i] != null && s.ms[i + 1] != null)).length
    return { rows: withAn, stats, neg, over, worst }
  }, [all, asOf, sc.key])
  if (!all || !data) return <Empty />
  const slow = (r: any) => r.d.some((x: number | null, i: number) => x != null && data.stats[i].p75 != null && x > data.stats[i].p75!)
  const rows = data.rows.filter(r => (!reg || r.wilayah === reg) && (!st || r.status === st) && (!late || slow(r)) && (stg == null || (r.d[stg] != null && data.stats[stg].p75 != null && r.d[stg]! > data.stats[stg].p75!)))
  const dom = data.over[0]
  const cell = (i: number) => (v: any) => { if (v == null) return <span className="text-slate-600">—</span>; const s = data.stats[i]; const c = s.med != null && v <= s.med ? '#34d399' : s.p75 != null && v <= s.p75 ? '#fbbf24' : '#fb7185'; return <span style={{ color: c }} className="num">{fmtNum(v, 1)}</span> }
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'si', label: 'No. SI' }, { key: 'kapal', label: 'TB/BG' }, { key: 'mitra', label: 'Mitra' }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) },
    ...STEPS.map((l, i) => ({ key: 's' + i, label: SHORT[i], tip: l + ' (hari)', fmt: cell(i) })), { key: 'tot', label: 'Total SI → bongkar', tip: 'SI → Selesai bongkar (hari)', fmt: v => v == null ? '—' : fmtNum(v, 1) },
    { key: 'masalah', label: 'Masalah & solusi', sticky: true, tip: 'Dugaan masalah dari lama tiap tahap, dan saran tindak lanjut', fmt: (v, r) => v ? <div className="w-[300px] whitespace-normal leading-snug text-[11.5px]">
      <div className="rounded-lg px-2 py-1 mb-1" style={{ background: 'rgba(248,113,113,.14)', borderLeft: '3px solid #f87171', color: '#fecaca' }}><b className="text-[10px] uppercase tracking-wider text-[#f87171]">Masalah </b>{v}</div>
      <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(52,211,153,.12)', borderLeft: '3px solid #34d399', color: '#a7f3d0' }}><b className="text-[10px] uppercase tracking-wider text-[#34d399]">Solusi </b>{r.an.solusi[0]}</div></div>
      : <span className="text-emerald-300">{r.d.every((x: any) => x == null) ? '—' : '✓ Normal'}</span> }]
  return <>
    <PageHead icon={GitBranch} color="#fbbf24" title="Linimasa & Keterlambatan Shipment" month={sc.label} sub={<>Sumber: sheet ALL Shipment (semua shipment tahun berjalan) · lama tiap tahap dalam hari, dihitung dari tanggal milestone di sheet</>} />
    <Card><p className="text-xs text-slate-300">Penanda warna memakai pembanding statistik, bukan SLA: <span className="text-[#34d399]">hijau</span> ≤ median, <span className="text-[#fbbf24]">kuning</span> ≤ persentil ke-75, <span className="text-[#fb7185]">merah</span> lebih lama dari persentil ke-75 untuk tahap yang sama. Perbandingan dengan ETA Rakor ada di menu <b>ETA Rakor &amp; Keterlambatan</b>. Klik baris mana pun untuk melihat masalah dan solusinya.</p></Card>
    <section className="hero" style={{ ['--hc' as any]: '#fbbf24' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2"><h2 className="font-bold text-sm">Sorotan Linimasa — tahap mana yang menahan shipment &amp; apa solusinya</h2><span className="text-[11px] text-slate-400">dibanding kebiasaan seluruh shipment (P75), bukan SLA</span></div>
      {!dom ? <p className="text-xs text-slate-300">Belum ada tahap yang melewati batas wajar, atau data tanggal milestone belum cukup.</p> : <>
        <div className="grid lg:grid-cols-2 gap-3 mb-3">
          <div><div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Jumlah shipment yang melewati P75 per tahap — klik batang untuk menyaring tabel</div>
            <div style={{ height: data.over.length * 30 + 24 }}><ResponsiveContainer><BarChart layout="vertical" data={data.over} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}><XAxis type="number" allowDecimals={false} stroke="#b4bccb" fontSize={10} /><YAxis type="category" dataKey="nama" width={typeof window !== "undefined" && window.innerWidth < 768 ? 122 : 150} stroke="#b4bccb" fontSize={typeof window !== "undefined" && window.innerWidth < 768 ? 10 : 11} interval={0} />
              <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} dari ${p.payload.tot} shipment`, 'Melewati P75']} {...TIP} />
              <RBar dataKey="n" barSize={16} radius={[0, 8, 8, 0]} cursor="pointer" onClick={(d: any) => setStg(stg === d.i ? null : d.i)}>{data.over.map(b => <Cell key={b.i} fill="#fbbf24" fillOpacity={stg != null && stg !== b.i ? 0.3 : 1} />)}</RBar></BarChart></ResponsiveContainer></div>
            {stg != null && <button className="text-xs text-[#f2c76b] underline" onClick={() => setStg(null)}>Lepas penyaring tahap: {STEPS[stg]}</button>}</div>
          <div className="grid gap-2 content-start"><div className="hl hl-masalah"><div className="hl-t">Masalah dominan</div><p>Tahap <b>{dom.nama}</b> paling sering melewati batas wajar: {dom.n} dari {dom.tot} shipment (median {data.stats[dom.i].med == null ? '—' : fmtNum(data.stats[dom.i].med!, 1)} hari, P75 {fmtNum(data.stats[dom.i].p75!, 1)} hari). Biasanya terkait: {CAUSE[dom.i]}.</p></div>
            <div className="hl hl-solusi"><div className="hl-t">Solusi prioritas</div><p>{SOLUSI[dom.i]}</p></div></div></div>
        {data.worst.length > 0 && <><div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Shipment yang paling menonjol lambat</div>
          <div className="grid gap-3">{data.worst.map(r => <div key={r.id} style={{ ['--c' as any]: '#fbbf24' }} className="pcard !p-3"><button className="w-full text-left mb-2 flex flex-wrap items-center gap-x-3 gap-y-1" onClick={() => setSel(r)}><b className="text-sm">{r.pltu}</b><span className="text-xs text-slate-300">SI {r.si || '—'} · {r.kapal || '—'} · {stageLabel(r.status)}</span></button><AnalisisBox a={r.an} /></div>)}</div></>}</>}
    </section>
    <div className="hscroll grid grid-cols-2 md:grid-cols-5 xl:grid-cols-9 gap-2 mb-3">{STEPS.map((l, i) => <Kpi key={l} label={l} value={data.stats[i].med == null ? '—' : fmtNum(data.stats[i].med!, 1)} unit="hari" note={`P75 ${data.stats[i].p75 == null ? '—' : fmtNum(data.stats[i].p75!, 1)} · n=${data.stats[i].n}`} accent="#e6b457" tip="Median lama tahap" />)}</div>
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs no-print">{sc.ui}<select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <select aria-label="Filter status" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{STATUSES.filter(s => s.key !== 'carryOver').map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      <label><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} /> hanya yang melewati P75 di salah satu tahap</label><span className="text-slate-500">{rows.length} shipment</span></div>
    <Card title="Tahap per Shipment (angka = hari) — klik baris untuk analisis"><DataTable rows={rows} cols={cols} name="linimasa-shipment" onRow={setSel} /></Card>
    {sel && <Card title={`Analisis tahap — ${sel.pltu} · SI ${sel.si || '—'}`} right={<button className="text-xs text-slate-300" onClick={() => setSel(null)}>Tutup</button>}><AnalisisBox a={sel.an} /><p className="text-[10px] text-slate-400 mt-2">Dugaan dari lama tiap tahap dibanding median/P75 seluruh shipment dan catatan sheet; konfirmasi dengan tim lapangan.</p></Card>}
    <p className="text-[11px] text-slate-500">{fmtNum(all.ships.length)} shipment terbaca; {fmtNum(data.rows.length)} punya minimal satu tahap bertanggal lengkap. {data.neg} shipment punya urutan tanggal terbalik (tahap itu dikosongkan). Tanggal di luar 2025–2027 atau format tidak dikenal dianggap kosong.</p>
  </>
}
