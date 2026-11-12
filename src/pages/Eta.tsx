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
import { useScope } from './useBulan'
import { useDetail } from '../components/Detail'
const iso = (t: number | null) => t == null ? null : new Date(t).toISOString().slice(0, 10)
const CAT: Record<string, string> = { Terlambat: '#fb7185', 'Tepat waktu': '#34d399', 'Belum tiba, lewat ETA': '#fbbf24', 'Belum jatuh tempo': '#38bdf8', 'Tanpa tanggal aktual': '#6b7280', 'ETA hanya bulan': '#a78bfa' }
const BINS: [string, (d: number) => boolean, string][] = [['≤ −3', d => d <= -3, '#34d399'], ['−2 s.d. −1', d => d >= -2 && d <= -1, '#34d399'], ['0', d => d === 0, '#34d399'], ['1 s.d. 2', d => d >= 1 && d <= 2, '#fbbf24'], ['3 s.d. 5', d => d >= 3 && d <= 5, '#fb923c'], ['≥ 6', d => d >= 6, '#fb7185']]
export default function Eta() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const [hist, setHist] = useState<EtaHist | null>(null)
  const [ai, setAi] = useState<Record<string, { d: string; delay: number; t: string; k: string }>>({}); const dt = useDetail()
  const [cmp, setCmp] = useState<Cmp>(6); const [tol, setTol] = useState(0); const [reg, setReg] = useState(''); const [cat, setCat] = useState(''); const [stg, setStg] = useState<number | null>(null)
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/eta-history.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setHist(await r.json()) } catch { setHist({}) } })() }, [])
  useEffect(() => { (async () => { try { const r = await fetch(snapBase() + '/analisis.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); setAi(await r.json()) } catch { setAi({}) } })() }, [])
  const sc = useScope(); const stats = useMemo(() => all ? stepStats(all.ships, stepDays) : [], [all])
  const ref = asOf ? Date.parse(asOf) : (() => { const w = new Date(Date.now() + 7 * 36e5); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) })()
  const rows = useMemo(() => !all ? [] : sc.pick(all.ships).filter(s => s.eta != null || s.etaTxt).map(s => {
    const d = etaDelay(s, cmp, ref); const h = (hist?.[s.id] ?? []).filter(x => !asOf || x[0] <= asOf)
    const c = s.eta == null ? 'ETA hanya bulan' : d.kind === 'aktual' ? (d.days! > tol ? 'Terlambat' : 'Tepat waktu') : d.kind === 'lewat-eta' ? (d.days! > tol ? 'Belum tiba, lewat ETA' : 'Belum jatuh tempo') : d.kind === 'tanpa-aktual' ? 'Tanpa tanggal aktual' : 'Belum jatuh tempo'
    const late = c === 'Terlambat' || c === 'Belum tiba, lewat ETA'; const an = late && (d.days ?? 0) > 0 ? analisis(s.ms, stepDays(s.ms), stats, s.note ?? '', ref, d.days) : null; const a = ai[s.id]; const aiOk = a && (!asOf || a.d <= asOf) ? a : null
    return { id: s.id, an, aiTxt: aiOk?.t ?? null, aiK: aiOk?.k ?? null, dur: stepDays(s.ms), note: s.note ?? '', utama: an?.utama ?? null, masalah: an?.masalah ?? null, solusi1: an?.solusi[0] ?? null, sev: an?.sev ?? null, pltu: s.plant, wilayah: regionOf(s.plant), si: s.si, kapal: s.tbbg.split(';')[0], mitra: s.mitraReal, konf: s.konfRaw, etaTxt: s.etaTxt, eta: iso(s.eta), aktual: iso(s.ms[cmp]), days: d.days, cat: c, status: s.stage,
      etaAwal: h.length ? h[0][1] : null, geser: h.length > 1 ? Math.round((Date.parse(h[h.length - 1][1]) - Date.parse(h[0][1])) / 864e5) : h.length ? 0 : null, chg: h.length ? h.length - 1 : null }
  }), [all, cmp, ref, tol, hist, asOf, stats, ai, sc.key])
  if (!all) return <Empty />
  const vis = rows.filter(r => (!reg || r.wilayah === reg) && (!cat || r.cat === cat) && (stg == null || r.utama === stg)); const base = rows.filter(r => !reg || r.wilayah === reg)
  const n = (c: string) => base.filter(r => r.cat === c).length; const done = n('Terlambat') + n('Tepat waktu'); const late = base.filter(r => r.cat === 'Terlambat')
  const avg = late.length ? late.reduce((a, r) => a + r.days!, 0) / late.length : null
  const lateAn = base.filter(r => r.an); const byStage = STEPS.map((nama, i) => ({ i, nama, n: lateAn.filter(r => r.utama === i).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n); const dom = byStage[0]
  const top = [...lateAn].filter(r => stg == null || r.utama === stg).sort((a, b) => (b.days ?? 0) - (a.days ?? 0)).slice(0, 8)
  const hasEta = all.ships.some(s => s.eta != null)
  const kut = (v: any) => v ? <span className="block min-w-[200px] max-w-[280px] whitespace-normal leading-snug text-slate-300" title={v}>{String(v).length > 90 ? String(v).slice(0, 90) + '…' : v}</span> : '—'
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'kapal', label: 'TB/BG' }, { key: 'mitra', label: 'Mitra' },
    { key: 'eta', label: 'ETA Rakor', fmt: (v, r) => v ? fmtDate(v) : <span className="text-slate-500">{r.etaTxt}</span> }, { key: 'aktual', label: CMP_LABEL[cmp], fmt: v => v ? fmtDate(v) : '—' },
    { key: 'days', label: 'Selisih (hari)', fmt: (v, r) => v == null ? '—' : <b style={{ color: CAT[r.cat] }}>{v > 0 ? '+' : ''}{fmtNum(v)}</b> }, { key: 'cat', label: 'Keterangan', fmt: v => <span style={{ color: CAT[v] }}>{v}</span> },
    { key: 'masalah', label: 'Dugaan penyebab', fmt: kut }]
  const openSel = (r: any) => dt.open({ variant: 'drawer', title: `${r.pltu} · ${r.kapal || r.id}`, sub: `SI ${r.si || '—'} · ${r.mitra || 'mitra —'}`, color: '#fb7185', stats: [{ l: 'ETA Rakor', v: r.eta ? fmtDate(r.eta) : r.etaTxt || '—' }, { l: CMP_LABEL[cmp], v: r.aktual ? fmtDate(r.aktual) : '—' }, { l: 'Selisih', v: r.days == null ? '—' : (r.days > 0 ? '+' : '') + fmtNum(r.days) + ' hari', c: CAT[r.cat] }],
    body: r.an ? <AnalisisBox a={r.an} ai={r.aiTxt} aiK={r.aiK} compact /> : <p className="text-xs text-slate-300">Shipment ini tidak terlambat (atau tanpa ETA), jadi tidak dianalisis.</p>,
    table: { head: ['Tahap', 'Lama (hari)', 'Median', 'P75'], rows: STEPS.map((n, i) => [n, r.dur[i] == null ? '—' : fmtNum(r.dur[i], 1), stats[i]?.med == null ? '—' : fmtNum(stats[i].med!, 1), stats[i]?.p75 == null ? '—' : fmtNum(stats[i].p75!, 1)]), align: ['l', 'r', 'r', 'r'] }, note: r.note ? 'Catatan sheet: ' + r.note : 'Dugaan dari tanggal milestone dibanding median/P75 seluruh shipment, bukan penyebab terkonfirmasi.' })
  return <>
    <PageHead icon={Clock} color="#fb7185" title="ETA Rakor & Keterlambatan" month={sc.label} sub={<>Sumber: sheet ALL Shipment · ETA Rakor = kolom <b>Tgl.</b> (tanggal dalam bulan konfirmasi) · selisih = tanggal aktual − ETA, positif berarti lebih lambat</>} />
    {!hasEta && <Card><p className="text-xs text-amber-300">Kolom "Tgl." tidak terbaca di sheet ALL Shipment, sehingga ETA tidak bisa dihitung. Cek nama kolom di halaman data mentah.</p></Card>}
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print"><span className="text-slate-400">Bandingkan ETA dengan:</span><select aria-label="Pembanding" value={cmp} onChange={e => setCmp(+e.target.value as Cmp)}>{([1, 6, 8, 9] as Cmp[]).map(k => <option key={k} value={k}>{CMP_LABEL[k]}</option>)}</select>
      <label>toleransi <input type="number" min={0} max={14} value={tol} onChange={e => setTol(Math.max(0, +e.target.value || 0))} className="w-14" /> hari</label>
      {sc.ui}<select aria-label="Wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><Kpi label="Shipment ber-ETA" value={fmtNum(base.length)} accent="#e6b457" /><Kpi label="Tepat waktu" value={fmtNum(n('Tepat waktu'))} note={done ? `${fmtNum(n('Tepat waktu') / done * 100, 1)}% dari yang sudah bertanggal aktual` : undefined} accent="#34d399" />
      <Kpi label="Terlambat" value={fmtNum(late.length)} note={avg == null ? undefined : `rata-rata +${fmtNum(avg, 1)} hari`} accent="#fb7185" /><Kpi label="Belum tiba, lewat ETA" value={fmtNum(n('Belum tiba, lewat ETA'))} accent="#fbbf24" /></div>
    <Card title="Paling terlambat" right={<span className="text-[11px] opacity-60">{lateAn.length} shipment terlambat / lewat ETA · klik untuk detail</span>}>
      {lateAn.length === 0 ? <p className="text-xs text-slate-300">Tidak ada shipment terlambat pada saringan ini.</p> : <>
        {byStage.length > 0 && <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]"><span className="opacity-60">Penyebab utama:</span>{byStage.map(x => <button key={x.i} onClick={() => setStg(stg === x.i ? null : x.i)} className={'fchip' + (stg === x.i ? ' on' : '')} style={{ ['--c' as any]: '#fb7185' }}>{x.nama} · {x.n}</button>)}</div>}
        <div className="an-list">{top.map(r => <div key={r.id} className="an-row" style={{ ['--c' as any]: '#fb7185' }}><button className="an-head" onClick={() => openSel(r)}><span className="an-main"><b>{r.pltu}</b><span className="an-v"> · {r.kapal || '—'}</span><span className="an-j">{r.masalah ? (r.masalah.length > 120 ? r.masalah.slice(0, 120) + '…' : r.masalah) : ''}</span></span><span className="an-chip">+{fmtNum(r.days ?? 0, 0)} hari</span></button></div>)}</div></>}</Card>
    <div className="flex flex-wrap items-center gap-1.5 my-3">{['', ...Object.keys(CAT)].map(k => <button key={k} onClick={() => setCat(cat === k ? '' : k)} className={'fchip' + (cat === k ? ' on' : '')} style={{ ['--c' as any]: CAT[k] ?? '#9aa3b2' }}>{k || 'Semua'}{k ? ` (${n(k)})` : ''}</button>)}</div>
    <Card title={`Daftar Shipment (${vis.length})`}><DataTable rows={vis} cols={cols} name="eta-rakor" onRow={openSel} /></Card>
  </>
}
