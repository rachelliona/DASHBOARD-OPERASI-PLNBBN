import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useStore } from '../store'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { useDetail } from '../components/Detail'
import { useScope } from './useBulan'
import { STEPS, pctl, stepDays } from '../domain/monthly'
import { fmtNum, fmtPct } from '../domain/format'
import { tone } from '../domain/view'
const SHORT = ['SI→TA POL', 'Antri sandar muat', 'Sandar→muat', 'Durasi muat', 'Muat→berlayar', 'Pelayaran', 'Antri sandar bongkar', 'Sandar→bongkar', 'Durasi bongkar']
type Dim = 'mitraReal' | 'transport' | 'sumber'
const DIM: Record<Dim, string> = { mitraReal: 'Mitra Realisasi', transport: 'Mitra Transport', sumber: 'Sumber Tambang' }
const med = (v: number[]) => pctl([...v].sort((a, b) => a - b), 0.5)
/** Kinerja mitra dari sheet ALL Shipment: volume, pemenuhan (D/S ÷ konfirmasi), median lama tiap tahap dan porsi shipment yang melewati P75 semua shipment. Analisis berbasis aturan, bukan AI. */
export default function KinerjaMitra() {
  const { all, raw, status, fetchSheet, asOf, bulanAktif } = useStore(); const sc = useScope(); const dt = useDetail(); const [dim, setDim] = useState<Dim>('mitraReal'); const [min, setMin] = useState(2)
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  const berjalan = sc.label === `${bulanAktif} 2026`
  const d = useMemo(() => {
    if (!all) return null
    const ships = sc.pick(all.ships); const days = ships.map(s => stepDays(s.ms))
    const stats = STEPS.map((_, i) => { const v = days.map(x => x[i]).filter((x): x is number => x != null).sort((a, b) => a - b); return { med: pctl(v, 0.5), p75: pctl(v, 0.75) } })
    const m = new Map<string, { nama: string; n: number; konf: number; bl: number; ds: number; st: number[][]; telat: number; ada: number; pltu: Set<string> }>()
    ships.forEach((s, k) => { const nama = ((s as any)[dim] as string || '').split(';')[0].trim() || '(tanpa nama)'; const a = m.get(nama) ?? { nama, n: 0, konf: 0, bl: 0, ds: 0, st: STEPS.map(() => []), telat: 0, ada: 0, pltu: new Set<string>() }
      a.n++; a.konf += s.jumlah ?? 0; a.bl += s.bl ?? 0; a.ds += s.ds ?? 0; a.pltu.add(s.plant); let ada = false, slow = false
      days[k].forEach((v, i) => { if (v == null) return; ada = true; a.st[i].push(v); if (stats[i].p75 != null && v > stats[i].p75!) slow = true }); if (ada) { a.ada++; if (slow) a.telat++ }; m.set(nama, a) })
    const rows = [...m.values()].map(a => { const p = a.konf > 0 ? a.ds / a.konf * 100 : null; const tel = a.ada ? a.telat / a.ada * 100 : null; const md = a.st.map(v => v.length ? med(v) : null)
      const diffs = md.map((v, i) => v != null && stats[i].med != null && a.st[i].length >= 2 ? { i, v, lebih: v - stats[i].med! } : null).filter(Boolean) as { i: number; v: number; lebih: number }[]; const worst = diffs.sort((x, y) => y.lebih - x.lebih)[0]
      const flag = (tel != null && tel >= 50 && a.ada >= 3) || (!berjalan && p != null && p < 60 && a.konf > 0)
      const cat = worst && worst.lebih >= 1 ? `Paling tertinggal di tahap ${SHORT[worst.i]}: median ${fmtNum(worst.v, 1)} hari vs ${fmtNum(stats[worst.i].med!, 1)} hari semua shipment (+${fmtNum(worst.lebih, 1)}).` : a.ada ? 'Lama tahap sebanding dengan median semua shipment.' : 'Belum ada tanggal milestone lengkap.'
      return { ...a, pltuN: a.pltu.size, p, tel, md, cat, flag, ...Object.fromEntries(md.map((v, i) => ['s' + i, v])) } as any }).filter(r => r.n >= min).sort((a, b) => b.ds - a.ds)
    return { rows, stats, ships }
  }, [all, sc.key, dim, min, berjalan])
  if (!all || !d) return <Empty />
  const R = d.rows; const tot = R.reduce((a: any, r: any) => ({ n: a.n + r.n, konf: a.konf + r.konf, ds: a.ds + r.ds }), { n: 0, konf: 0, ds: 0 }); const perhatian = R.filter((r: any) => r.flag)
  const cols: Col[] = [{ key: 'nama', label: DIM[dim] }, { key: 'n', label: 'Shipment' }, { key: 'pltuN', label: 'PLTU' }, { key: 'konf', label: 'Konfirmasi (MT)', fmt: v => fmtNum(v) }, { key: 'bl', label: 'B/L (MT)', fmt: v => fmtNum(v) }, { key: 'ds', label: 'D/S (MT)', fmt: v => fmtNum(v) },
    { key: 'p', label: 'Pemenuhan', fmt: v => v == null ? '—' : <span style={{ color: tone(v) }}>{fmtPct(v)}</span> }, { key: 'tel', label: 'Lewat P75', tip: 'Porsi shipment yang minimal satu tahapnya lebih lama dari P75 semua shipment', fmt: v => v == null ? '—' : <span style={{ color: v >= 50 ? '#fb7185' : v >= 30 ? '#fbbf24' : '#34d399' }}>{fmtPct(v)}</span> },
    { key: 's3', label: 'Muat (hr)', fmt: v => v == null ? '—' : fmtNum(v, 1) }, { key: 's5', label: 'Layar (hr)', fmt: v => v == null ? '—' : fmtNum(v, 1) }, { key: 's6', label: 'Antri bongkar (hr)', fmt: v => v == null ? '—' : fmtNum(v, 1) }, { key: 's8', label: 'Bongkar (hr)', fmt: v => v == null ? '—' : fmtNum(v, 1) },
    { key: 'cat', label: 'Catatan analisis', fmt: (v, r) => <div className="w-[320px] whitespace-normal text-[11.5px] leading-snug" style={{ color: r.flag ? '#fecaca' : undefined }}>{v}</div> }]
  const open = (r: any) => dt.open({ title: r.nama, sub: `${DIM[dim]} · ${sc.label}`, color: '#a78bfa', icon: Users, stats: [{ l: 'Shipment', v: String(r.n) }, { l: 'Konfirmasi', v: fmtNum(r.konf) + ' MT' }, { l: 'D/S', v: fmtNum(r.ds) + ' MT' }, { l: 'Pemenuhan', v: fmtPct(r.p), c: tone(r.p) }, { l: 'Lewat P75', v: fmtPct(r.tel) }], note: r.cat,
    bars: [{ title: 'Median lama tahap mitra ini (hari)', items: STEPS.map((_, i) => ({ l: SHORT[i], v: r.md[i] ?? 0, c: r.md[i] != null && d.stats[i].p75 != null && r.md[i] > d.stats[i].p75! ? '#fb7185' : '#a78bfa', sub: d.stats[i].med == null ? undefined : `median semua ${fmtNum(d.stats[i].med!, 1)}` })), fmt: (v: number) => v.toFixed(1) }], table: { head: ['PLTU tujuan'], rows: [...r.pltu].sort().map((x: string) => [x]) } })
  return <>
    <PageHead icon={Users} color="#a78bfa" title="Kinerja Mitra" month={sc.label} sub="Volume, pemenuhan, dan lama tiap tahap per mitra — dari sheet ALL Shipment · analisis berbasis aturan (bukan AI)" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><Kpi label={DIM[dim]} value={fmtNum(R.length)} accent="#a78bfa" /><Kpi label="Shipment" value={fmtNum(tot.n)} accent="#38bdf8" /><Kpi label="Pemenuhan D/S per konfirmasi" value={tot.konf ? fmtNum(tot.ds / tot.konf * 100, 1) : '—'} unit="%" accent="#34d399" /><Kpi label="Perlu perhatian" value={fmtNum(perhatian.length)} note={berjalan ? 'lewat P75 ≥ 50% (min. 3 shipment bertanggal)' : 'lewat P75 ≥ 50% atau pemenuhan < 60%'} accent="#fb7185" /></div>
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print">{sc.ui}<select aria-label="Kelompokkan menurut" value={dim} onChange={e => setDim(e.target.value as Dim)}>{(Object.keys(DIM) as Dim[]).map(k => <option key={k} value={k}>{DIM[k]}</option>)}</select>
      <label className="flex items-center gap-1">minimal <select aria-label="Minimal shipment" value={min} onChange={e => setMin(+e.target.value)}>{[1, 2, 3, 5, 10].map(x => <option key={x}>{x}</option>)}</select> shipment</label></div>
    {perhatian.length > 0 && <Card title="Perlu perhatian"><ul className="grid md:grid-cols-2 gap-2 text-xs">{perhatian.slice(0, 6).map((r: any) => <li key={r.nama}><button className="text-left w-full hl" style={{ ['--hc' as any]: '#fb7185' }} onClick={() => open(r)}><div className="hl-t">{r.nama}</div><p>{r.n} shipment · pemenuhan {fmtPct(r.p)} · lewat P75 {fmtPct(r.tel)}</p><p className="mt-1">{r.cat}</p></button></li>)}</ul></Card>}
    <Card title={`Tabel kinerja per ${DIM[dim].toLowerCase()} — klik baris untuk detail`}><DataTable rows={R} cols={cols} name="kinerja-mitra" onRow={open} /></Card>
    <p className="text-[11px] text-slate-500 mt-2">Pemenuhan = Σ D/S dibagi Σ jumlah konfirmasi mitra (pada bulan yang masih berjalan tidak dipakai sebagai penanda karena shipment belum selesai). Lewat P75 = porsi shipment yang minimal satu tahap lebih lama dari persentil ke-75 seluruh shipment pada cakupan ini. Perbandingan antar mitra tanpa memperhitungkan jarak rute, jenis kapal, atau musim.</p>
  </>
}
