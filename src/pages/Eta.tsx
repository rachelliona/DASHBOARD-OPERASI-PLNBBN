import { Clock } from 'lucide-react'
import { TIP } from '../components/chartTheme'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, stageLabel } from '../domain/status'
import { regionOf, stepDays, STEPS } from '../domain/monthly'
import { analisis, stepStats, CAUSE, SOLUSI } from '../domain/sebab'
import AnalisisBox from '../components/AnalisisBox'
import { CMP_LABEL, Cmp, EtaHist, etaDelay } from '../domain/eta'
import { snapBase } from '../config/snapshots'
import { fmtDate, fmtNum } from '../domain/format'
const iso = (t: number | null) => t == null ? null : new Date(t).toISOString().slice(0, 10)
const CAT: Record<string, string> = { Terlambat: '#fb7185', 'Tepat waktu': '#34d399', 'Belum tiba, lewat ETA': '#fbbf24', 'Belum jatuh tempo': '#38bdf8', 'Tanpa tanggal aktual': '#6b7280', 'ETA hanya bulan': '#a78bfa' }
const BINS: [string, (d: number) => boolean, string][] = [['≤ −3', d => d <= -3, '#34d399'], ['−2 s.d. −1', d => d >= -2 && d <= -1, '#34d399'], ['0', d => d === 0, '#34d399'], ['1 s.d. 2', d => d >= 1 && d <= 2, '#fbbf24'], ['3 s.d. 5', d => d >= 3 && d <= 5, '#fb923c'], ['≥ 6', d => d >= 6, '#fb7185']]
export default function Eta() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const [hist, setHist] = useState<EtaHist | null>(null)
  const [ai, setAi] = useState<Record<string, { d: string; delay: number; t: string; k: string }>>({}); const [sel, setSel] = useState<any>(null)
  const [cmp, setCmp] = useState<Cmp>(6); const [tol, setTol] = useState(0); const [reg, setReg] = useState(''); const [cat, setCat] = useState(''); const [stg, setStg] = useState<number | null>(null)
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/eta-history.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setHist(await r.json()) } catch { setHist({}) } })() }, [])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/analisis.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setAi(await r.json()) } catch { setAi({}) } })() }, [])
  const stats = useMemo(() => all ? stepStats(all.ships, stepDays) : [], [all])
  const ref = asOf ? Date.parse(asOf) : (() => { const w = new Date(Date.now() + 7 * 36e5); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) })()
  const rows = useMemo(() => !all ? [] : all.ships.filter(s => s.eta != null || s.etaTxt).map(s => {
    const d = etaDelay(s, cmp, ref); const h = (hist?.[s.id] ?? []).filter(x => !asOf || x[0] <= asOf)
    const c = s.eta == null ? 'ETA hanya bulan' : d.kind === 'aktual' ? (d.days! > tol ? 'Terlambat' : 'Tepat waktu') : d.kind === 'lewat-eta' ? (d.days! > tol ? 'Belum tiba, lewat ETA' : 'Belum jatuh tempo') : d.kind === 'tanpa-aktual' ? 'Tanpa tanggal aktual' : 'Belum jatuh tempo'
    const late = c === 'Terlambat' || c === 'Belum tiba, lewat ETA'; const an = late && (d.days ?? 0) > 0 ? analisis(s.ms, stepDays(s.ms), stats, s.note ?? '', ref, d.days) : null; const a = ai[s.id]; const aiOk = a && (!asOf || a.d <= asOf) ? a : null
    return { id: s.id, an, aiTxt: aiOk?.t ?? null, aiK: aiOk?.k ?? null, dur: stepDays(s.ms), note: s.note ?? '', utama: an?.utama ?? null, masalah: an?.masalah ?? null, solusi1: an?.solusi[0] ?? null, sev: an?.sev ?? null, pltu: s.plant, wilayah: regionOf(s.plant), si: s.si, kapal: s.tbbg.split(';')[0], mitra: s.mitraReal, konf: s.konfRaw, etaTxt: s.etaTxt, eta: iso(s.eta), aktual: iso(s.ms[cmp]), days: d.days, cat: c, status: s.stage,
      etaAwal: h.length ? h[0][1] : null, geser: h.length > 1 ? Math.round((Date.parse(h[h.length - 1][1]) - Date.parse(h[0][1])) / 864e5) : h.length ? 0 : null, chg: h.length ? h.length - 1 : null }
  }), [all, cmp, ref, tol, hist, asOf, stats, ai])
  if (!all) return <Empty />
  const vis = rows.filter(r => (!reg || r.wilayah === reg) && (!cat || r.cat === cat) && (stg == null || r.utama === stg)); const base = rows.filter(r => !reg || r.wilayah === reg)
  const n = (c: string) => base.filter(r => r.cat === c).length; const done = n('Terlambat') + n('Tepat waktu'); const late = base.filter(r => r.cat === 'Terlambat')
  const avg = late.length ? late.reduce((a, r) => a + r.days!, 0) / late.length : null
  const lateAn = base.filter(r => r.an); const byStage = STEPS.map((nama, i) => ({ i, nama, n: lateAn.filter(r => r.utama === i).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n); const dom = byStage[0]
  const top = [...lateAn].sort((a, b) => (b.days ?? 0) - (a.days ?? 0)).slice(0, 5)
  const hasEta = all.ships.some(s => s.eta != null)
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'si', label: 'No. SI' }, { key: 'kapal', label: 'TB/BG' }, { key: 'mitra', label: 'Mitra' }, { key: 'konf', label: 'Konfirmasi' },
    { key: 'eta', label: 'ETA Rakor', fmt: (v, r) => v ? fmtDate(v) : <span className="text-slate-500">{r.etaTxt}</span> }, { key: 'aktual', label: CMP_LABEL[cmp], fmt: v => v ? fmtDate(v) : '—' },
    { key: 'days', label: 'Selisih (hari)', fmt: (v, r) => v == null ? '—' : <b style={{ color: CAT[r.cat] }}>{v > 0 ? '+' : ''}{fmtNum(v)}</b> }, { key: 'cat', label: 'Keterangan', fmt: v => <span style={{ color: CAT[v] }}>{v}</span> },
    { key: 'etaAwal', label: 'ETA awal (riwayat)', fmt: v => v ? fmtDate(v) : '—' }, { key: 'geser', label: 'Geser ETA (hari)', fmt: v => v == null ? '—' : (v > 0 ? '+' : '') + fmtNum(v) }, { key: 'chg', label: 'Jml perubahan' }, { key: 'masalah', label: 'Masalah (dugaan)', fmt: v => v ? <span className="text-red-300 block min-w-[230px] max-w-[300px] whitespace-normal leading-snug" title={v}>{v.length > 110 ? v.slice(0, 110) + '…' : v}</span> : '—' }, { key: 'solusi1', label: 'Solusi', fmt: v => v ? <span className="text-emerald-300 block min-w-[230px] max-w-[300px] whitespace-normal leading-snug" title={v}>{v.length > 110 ? v.slice(0, 110) + '…' : v}</span> : '—' }, { key: 'aiTxt', label: 'Analisis AI', fmt: (v, r) => v ? <span title={v}>{String(v).slice(0, 70)}{String(v).length > 70 ? '…' : ''} <i className="text-slate-500">({r.aiK})</i></span> : <span className="text-slate-500">{r.an ? 'menunggu' : '—'}</span> }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
  return <>
    <PageHead icon={Clock} color="#fb7185" title="ETA Rakor & Keterlambatan" sub={<>Sumber: sheet ALL Shipment · ETA Rakor = kolom <b>Tgl.</b> (tanggal dalam bulan konfirmasi) · selisih = tanggal aktual − ETA, positif berarti lebih lambat</>} />
    {!hasEta && <Card><p className="text-xs text-amber-300">Kolom "Tgl." tidak terbaca di sheet ALL Shipment, sehingga ETA tidak bisa dihitung. Cek nama kolom di halaman data mentah.</p></Card>}
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print"><span className="text-slate-400">Bandingkan ETA dengan:</span><select aria-label="Pembanding" value={cmp} onChange={e => setCmp(+e.target.value as Cmp)}>{([1, 6, 8, 9] as Cmp[]).map(k => <option key={k} value={k}>{CMP_LABEL[k]}</option>)}</select>
      <label>toleransi <input type="number" min={0} max={14} value={tol} onChange={e => setTol(Math.max(0, +e.target.value || 0))} className="w-14" /> hari</label>
      <select aria-label="Wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3"><Kpi label="Shipment ber-ETA" value={fmtNum(base.length)} accent="#e6b457" /><Kpi label="Tepat waktu" value={fmtNum(n('Tepat waktu'))} note={done ? `${fmtNum(n('Tepat waktu') / done * 100, 1)}% dari yang sudah bertanggal aktual` : undefined} accent="#34d399" />
      <Kpi label="Terlambat" value={fmtNum(late.length)} note={avg == null ? undefined : `rata-rata +${fmtNum(avg, 1)} hari`} accent="#fb7185" /><Kpi label="Belum tiba, lewat ETA" value={fmtNum(n('Belum tiba, lewat ETA'))} accent="#fbbf24" /><Kpi label="Sudah berubah ETA" value={fmtNum(base.filter(r => (r.chg ?? 0) > 0).length)} note={hist && Object.keys(hist).length ? 'dari riwayat snapshot' : 'riwayat belum terkumpul'} accent="#a78bfa" /></div>
    <section className="hero" style={{ ['--hc' as any]: '#f87171' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2"><h2 className="font-bold text-sm">Sorotan Keterlambatan — kenapa terlambat &amp; apa solusinya</h2><span className="text-[11px] text-slate-400">{lateAn.length} shipment terlambat / lewat ETA · dugaan dari tanggal milestone &amp; catatan sheet</span></div>
      {lateAn.length === 0 ? <p className="text-xs text-slate-300">Tidak ada shipment terlambat pada filter ini. {hasEta ? '' : 'ETA belum terbaca dari sheet.'}</p> : <>
        <div className="grid lg:grid-cols-2 gap-3 mb-3">
          <div><div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Tahap yang paling sering jadi penyebab — klik batang untuk menyaring tabel</div>
            <div style={{ height: byStage.length * 30 + 24 }}><ResponsiveContainer><BarChart layout="vertical" data={byStage} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}><XAxis type="number" allowDecimals={false} stroke="#b4bccb" fontSize={10} /><YAxis type="category" dataKey="nama" width={typeof window !== "undefined" && window.innerWidth < 768 ? 122 : 150} stroke="#b4bccb" fontSize={typeof window !== "undefined" && window.innerWidth < 768 ? 10 : 11} interval={0} />
              <Tooltip formatter={(v: any) => [v + ' shipment', 'Jumlah']} {...TIP} />
              <RBar dataKey="n" barSize={16} radius={[0, 8, 8, 0]} cursor="pointer" onClick={(d: any) => setStg(stg === d.i ? null : d.i)}>{byStage.map(b => <Cell key={b.i} fill="#f87171" fillOpacity={stg != null && stg !== b.i ? 0.3 : 1} />)}</RBar></BarChart></ResponsiveContainer></div>
            {stg != null && <button className="text-xs text-[#f2c76b] underline" onClick={() => setStg(null)}>Lepas penyaring tahap: {STEPS[stg]}</button>}</div>
          {dom && <div className="grid gap-2 content-start"><div className="hl hl-masalah"><div className="hl-t">Masalah dominan</div><p>Paling banyak shipment terlambat tertahan di tahap <b>{dom.nama}</b> ({dom.n} dari {lateAn.length}). Biasanya terkait: {CAUSE[dom.i]}.</p></div>
            <div className="hl hl-solusi"><div className="hl-t">Solusi prioritas</div><p>{SOLUSI[dom.i]}</p></div></div>}</div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">5 shipment paling terlambat</div>
        <div className="grid gap-3">{top.map(r => <div key={r.id} style={{ ['--c' as any]: '#fb7185' }} className="pcard !p-3"><button className="w-full text-left mb-2 flex flex-wrap items-center gap-x-3 gap-y-1" onClick={() => setSel(r)}>
          <b className="text-sm">{r.pltu}</b><span className="text-xs text-slate-300">SI {r.si || '—'} · {r.kapal || '—'} · {r.mitra || '—'}</span><span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(248,113,113,.18)', color: '#fca5a5' }}>+{fmtNum(r.days ?? 0)} hari</span></button>
          <AnalisisBox a={r.an!} ai={r.aiTxt} aiK={r.aiK} /></div>)}</div></>}
    </section>
    <div className="grid lg:grid-cols-3 gap-3"><Card title="Sebaran Selisih (hari)"><div style={{ height: 200 }}><ResponsiveContainer><BarChart data={BINS.map(([l, f, c]) => ({ l, c, v: base.filter(r => r.days != null && r.cat !== 'Belum tiba, lewat ETA' && r.cat !== 'Belum jatuh tempo' && f(r.days)).length }))}><XAxis dataKey="l" stroke="#9aa3b2" fontSize={10} /><YAxis stroke="#9aa3b2" fontSize={10} allowDecimals={false} /><Tooltip formatter={(v: any) => [v + ' shipment', 'Jumlah']} {...TIP} /><RBar dataKey="v" radius={[4, 4, 0, 0]}>{BINS.map((b, i) => <Cell key={i} fill={b[2]} />)}</RBar></BarChart></ResponsiveContainer></div></Card>
      <div className="lg:col-span-2"><Card title="Keterangan"><div className="flex flex-wrap gap-1.5">{['', ...Object.keys(CAT)].map(k => <button key={k} onClick={() => setCat(cat === k ? '' : k)} className={'fchip' + (cat === k ? ' on' : '')} style={{ ['--c' as any]: CAT[k] ?? '#9aa3b2' }}>{k || 'Semua'} · {k ? n(k) : base.length}</button>)}</div>
        <p className="text-[11px] text-slate-500 mt-2">Pergeseran ETA antar-Rakor dihitung dari riwayat snapshot harian (hanya shipment yang sudah punya No. SI), dan mulai terkumpul sejak workflow Snapshot Harian pertama jalan. Selisih untuk shipment tanpa tanggal aktual dihitung dari hari ini{asOf ? ` (tanggal terpilih: ${fmtDate(asOf)})` : ''}.</p></Card></div></div>
    {sel && <Card title={`Analisis keterlambatan — ${sel.pltu} · ${sel.kapal || sel.id}`} right={<button className="text-xs text-slate-300" onClick={() => setSel(null)}>Tutup</button>}>
      {!sel.an ? <p className="text-xs text-slate-300">Shipment ini tidak terlambat (atau tanpa ETA), sehingga tidak dianalisis.</p> : <>
      <AnalisisBox a={sel.an} ai={sel.aiTxt} aiK={sel.aiK} />
      <table className="w-full text-xs my-2"><thead><tr className="text-left text-slate-400"><th>Tahap</th><th>Lama (hari)</th><th>Median</th><th>P75</th></tr></thead><tbody>{STEPS.map((n, i) => { const x = sel.dur[i], st = stats[i]; const hot = sel.an.slow.some((z: any) => z.i === i) || sel.an.running?.i === i
        return <tr key={n} className="border-t border-white/5" style={hot ? { color: '#fca5a5', fontWeight: 600 } : undefined}><td>{n}{hot ? ' ⚠' : ''}</td><td>{x == null ? '—' : fmtNum(x, 1)}</td><td>{st?.med == null ? '—' : fmtNum(st.med, 1)}</td><td>{st?.p75 == null ? '—' : fmtNum(st.p75, 1)}</td></tr> })}</tbody></table>
      {sel.note && <p className="text-[11px] text-slate-300 mb-1">Catatan sheet: {sel.note}</p>}
      <p className="text-[10px] text-slate-400">Ini dugaan dari tanggal milestone dan catatan sheet (dibanding median/P75 seluruh shipment), bukan penyebab terkonfirmasi. Konfirmasi dengan tim lapangan sebelum mengambil keputusan.</p></>}</Card>}
    <Card title={`Daftar Shipment (${vis.length}) — klik baris untuk analisis penyebab`}><DataTable rows={vis} cols={cols} name="eta-rakor" onRow={setSel} /></Card>
  </>
}
