import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../store'
import { Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, stageLabel } from '../domain/status'
import { regionOf, stepDays, STEPS } from '../domain/monthly'
import { analisis, stepStats, CAUSE } from '../domain/sebab'
import { CMP_LABEL, Cmp, EtaHist, etaDelay } from '../domain/eta'
import { snapBase } from '../config/snapshots'
import { fmtDate, fmtNum } from '../domain/format'
const iso = (t: number | null) => t == null ? null : new Date(t).toISOString().slice(0, 10)
const CAT: Record<string, string> = { Terlambat: '#fb7185', 'Tepat waktu': '#34d399', 'Belum tiba, lewat ETA': '#fbbf24', 'Belum jatuh tempo': '#38bdf8', 'Tanpa tanggal aktual': '#6b7280', 'ETA hanya bulan': '#a78bfa' }
const BINS: [string, (d: number) => boolean, string][] = [['≤ −3', d => d <= -3, '#34d399'], ['−2 s.d. −1', d => d >= -2 && d <= -1, '#34d399'], ['0', d => d === 0, '#34d399'], ['1 s.d. 2', d => d >= 1 && d <= 2, '#fbbf24'], ['3 s.d. 5', d => d >= 3 && d <= 5, '#fb923c'], ['≥ 6', d => d >= 6, '#fb7185']]
export default function Eta() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const [hist, setHist] = useState<EtaHist | null>(null)
  const [ai, setAi] = useState<Record<string, { d: string; delay: number; t: string; k: string }>>({}); const [sel, setSel] = useState<any>(null)
  const [cmp, setCmp] = useState<Cmp>(6); const [tol, setTol] = useState(0); const [reg, setReg] = useState(''); const [cat, setCat] = useState('')
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/eta-history.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setHist(await r.json()) } catch { setHist({}) } })() }, [])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/analisis.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setAi(await r.json()) } catch { setAi({}) } })() }, [])
  const stats = useMemo(() => all ? stepStats(all.ships, stepDays) : [], [all])
  const ref = asOf ? Date.parse(asOf) : (() => { const w = new Date(Date.now() + 7 * 36e5); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) })()
  const rows = useMemo(() => !all ? [] : all.ships.filter(s => s.eta != null || s.etaTxt).map(s => {
    const d = etaDelay(s, cmp, ref); const h = (hist?.[s.id] ?? []).filter(x => !asOf || x[0] <= asOf)
    const c = s.eta == null ? 'ETA hanya bulan' : d.kind === 'aktual' ? (d.days! > tol ? 'Terlambat' : 'Tepat waktu') : d.kind === 'lewat-eta' ? (d.days! > tol ? 'Belum tiba, lewat ETA' : 'Belum jatuh tempo') : d.kind === 'tanpa-aktual' ? 'Tanpa tanggal aktual' : 'Belum jatuh tempo'
    const late = c === 'Terlambat' || c === 'Belum tiba, lewat ETA'; const an = late && (d.days ?? 0) > 0 ? analisis(s.ms, stepDays(s.ms), stats, s.note ?? '', ref, d.days) : null; const a = ai[s.id]; const aiOk = a && (!asOf || a.d <= asOf) ? a : null
    return { id: s.id, an, aiTxt: aiOk?.t ?? null, aiK: aiOk?.k ?? null, dur: stepDays(s.ms), note: s.note ?? '', sebab: an ? (an.utama != null ? STEPS[an.utama] : an.tags[0] ?? 'Tidak menonjol') : null, pltu: s.plant, wilayah: regionOf(s.plant), si: s.si, kapal: s.tbbg.split(';')[0], mitra: s.mitraReal, konf: s.konfRaw, etaTxt: s.etaTxt, eta: iso(s.eta), aktual: iso(s.ms[cmp]), days: d.days, cat: c, status: s.stage,
      etaAwal: h.length ? h[0][1] : null, geser: h.length > 1 ? Math.round((Date.parse(h[h.length - 1][1]) - Date.parse(h[0][1])) / 864e5) : h.length ? 0 : null, chg: h.length ? h.length - 1 : null }
  }), [all, cmp, ref, tol, hist, asOf, stats, ai])
  if (!all) return <Empty />
  const vis = rows.filter(r => (!reg || r.wilayah === reg) && (!cat || r.cat === cat)); const base = rows.filter(r => !reg || r.wilayah === reg)
  const n = (c: string) => base.filter(r => r.cat === c).length; const done = n('Terlambat') + n('Tepat waktu'); const late = base.filter(r => r.cat === 'Terlambat')
  const avg = late.length ? late.reduce((a, r) => a + r.days!, 0) / late.length : null
  const hasEta = all.ships.some(s => s.eta != null)
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'si', label: 'No. SI' }, { key: 'kapal', label: 'TB/BG' }, { key: 'mitra', label: 'Mitra' }, { key: 'konf', label: 'Konfirmasi' },
    { key: 'eta', label: 'ETA Rakor', fmt: (v, r) => v ? fmtDate(v) : <span className="text-slate-500">{r.etaTxt}</span> }, { key: 'aktual', label: CMP_LABEL[cmp], fmt: v => v ? fmtDate(v) : '—' },
    { key: 'days', label: 'Selisih (hari)', fmt: (v, r) => v == null ? '—' : <b style={{ color: CAT[r.cat] }}>{v > 0 ? '+' : ''}{fmtNum(v)}</b> }, { key: 'cat', label: 'Keterangan', fmt: v => <span style={{ color: CAT[v] }}>{v}</span> },
    { key: 'etaAwal', label: 'ETA awal (riwayat)', fmt: v => v ? fmtDate(v) : '—' }, { key: 'geser', label: 'Geser ETA (hari)', fmt: v => v == null ? '—' : (v > 0 ? '+' : '') + fmtNum(v) }, { key: 'chg', label: 'Jml perubahan' }, { key: 'sebab', label: 'Dugaan penyebab (aturan)', fmt: v => v ? <span className="text-amber-300">{v}</span> : '—' }, { key: 'aiTxt', label: 'Analisis AI', fmt: (v, r) => v ? <span title={v}>{String(v).slice(0, 70)}{String(v).length > 70 ? '…' : ''} <i className="text-slate-500">({r.aiK})</i></span> : <span className="text-slate-500">{r.an ? 'menunggu' : '—'}</span> }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) }]
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">ETA Rakor & Keterlambatan</h2><p className="text-[11px] text-slate-500">Sumber: sheet ALL Shipment · ETA Rakor = kolom <b>Tgl.</b> (tanggal dalam bulan konfirmasi) · selisih = tanggal aktual − ETA, positif berarti lebih lambat</p></div>
    {!hasEta && <Card><p className="text-xs text-amber-300">Kolom "Tgl." tidak terbaca di sheet ALL Shipment, sehingga ETA tidak bisa dihitung. Cek nama kolom di halaman data mentah.</p></Card>}
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print"><span className="text-slate-400">Bandingkan ETA dengan:</span><select aria-label="Pembanding" value={cmp} onChange={e => setCmp(+e.target.value as Cmp)}>{([6, 8, 9] as Cmp[]).map(k => <option key={k} value={k}>{CMP_LABEL[k]}</option>)}</select>
      <label>toleransi <input type="number" min={0} max={14} value={tol} onChange={e => setTol(Math.max(0, +e.target.value || 0))} className="w-14" /> hari</label>
      <select aria-label="Wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3"><Kpi label="Shipment ber-ETA" value={fmtNum(base.length)} accent="#e6b457" /><Kpi label="Tepat waktu" value={fmtNum(n('Tepat waktu'))} note={done ? `${fmtNum(n('Tepat waktu') / done * 100, 1)}% dari yang sudah bertanggal aktual` : undefined} accent="#34d399" />
      <Kpi label="Terlambat" value={fmtNum(late.length)} note={avg == null ? undefined : `rata-rata +${fmtNum(avg, 1)} hari`} accent="#fb7185" /><Kpi label="Belum tiba, lewat ETA" value={fmtNum(n('Belum tiba, lewat ETA'))} accent="#fbbf24" /><Kpi label="Sudah berubah ETA" value={fmtNum(base.filter(r => (r.chg ?? 0) > 0).length)} note={hist && Object.keys(hist).length ? 'dari riwayat snapshot' : 'riwayat belum terkumpul'} accent="#a78bfa" /></div>
    <div className="grid lg:grid-cols-3 gap-3"><Card title="Sebaran Selisih (hari)"><div style={{ height: 200 }}><ResponsiveContainer><BarChart data={BINS.map(([l, f, c]) => ({ l, c, v: base.filter(r => r.days != null && r.cat !== 'Belum tiba, lewat ETA' && r.cat !== 'Belum jatuh tempo' && f(r.days)).length }))}><XAxis dataKey="l" stroke="#9aa3b2" fontSize={10} /><YAxis stroke="#9aa3b2" fontSize={10} allowDecimals={false} /><Tooltip formatter={(v: any) => [v + ' shipment', 'Jumlah']} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} /><RBar dataKey="v" radius={[4, 4, 0, 0]}>{BINS.map((b, i) => <Cell key={i} fill={b[2]} />)}</RBar></BarChart></ResponsiveContainer></div></Card>
      <div className="lg:col-span-2"><Card title="Keterangan"><div className="flex flex-wrap gap-1.5">{['', ...Object.keys(CAT)].map(k => <button key={k} onClick={() => setCat(cat === k ? '' : k)} className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: CAT[k] ?? '#9aa3b2', background: cat === k ? CAT[k] ?? '#9aa3b2' : 'transparent', color: cat === k ? '#15130d' : CAT[k] ?? '#9aa3b2' }}>{k || 'Semua'} · {k ? n(k) : base.length}</button>)}</div>
        <p className="text-[11px] text-slate-500 mt-2">Pergeseran ETA antar-Rakor dihitung dari riwayat snapshot harian (hanya shipment yang sudah punya No. SI), dan mulai terkumpul sejak workflow Snapshot Harian pertama jalan. Selisih untuk shipment tanpa tanggal aktual dihitung dari hari ini{asOf ? ` (tanggal terpilih: ${fmtDate(asOf)})` : ''}.</p></Card></div></div>
    {sel && <Card title={`Analisis keterlambatan — ${sel.pltu} · ${sel.kapal || sel.id}`} right={<button className="text-xs text-slate-400" onClick={() => setSel(null)}>Tutup</button>}>
      {!sel.an ? <p className="text-xs text-slate-400">Shipment ini tidak terlambat (atau tanpa ETA), sehingga tidak dianalisis.</p> : <>
      <p className="text-xs mb-2">{sel.an.teks}</p>
      <table className="w-full text-xs mb-2"><thead><tr className="text-left text-slate-400"><th>Tahap</th><th>Lama (hari)</th><th>Median</th><th>P75</th></tr></thead><tbody>{STEPS.map((n, i) => { const x = sel.dur[i], st = stats[i]; const hot = sel.an.slow.some((z: any) => z.i === i) || sel.an.running?.i === i
        return <tr key={n} className="border-t border-white/5" style={hot ? { color: '#fbbf24' } : undefined}><td>{n}</td><td>{x == null ? '—' : fmtNum(x, 1)}</td><td>{st?.med == null ? '—' : fmtNum(st.med, 1)}</td><td>{st?.p75 == null ? '—' : fmtNum(st.p75, 1)}</td></tr> })}</tbody></table>
      {sel.note && <p className="text-[11px] text-slate-400 mb-1">Catatan sheet: {sel.note}</p>}
      {sel.an.utama != null && <p className="text-[11px] text-slate-400 mb-1">Kemungkinan area masalah: {CAUSE[sel.an.utama]}</p>}
      <p className="text-xs"><b>Analisis AI:</b> {sel.aiTxt ? <>{sel.aiTxt} <i className="text-slate-500">(keyakinan {sel.aiK})</i></> : <span className="text-slate-500">belum tersedia — aktif setelah ANTHROPIC_API_KEY diisi di GitHub Secrets dan workflow Snapshot Harian berjalan.</span>}</p>
      <p className="text-[10px] text-slate-500 mt-2">Ini dugaan dari tanggal milestone dan catatan sheet (dibanding median/P75 seluruh shipment), bukan penyebab terkonfirmasi. Konfirmasi dengan tim lapangan.</p></>}</Card>}
    <Card title={`Daftar Shipment (${vis.length}) — klik baris untuk analisis penyebab`}><DataTable rows={vis} cols={cols} name="eta-rakor" onRow={setSel} /></Card>
  </>
}
