import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { REGIONS, STATUSES, stageLabel } from '../domain/status'
import { STEPS, pctl, regionOf, stepDays } from '../domain/monthly'
import { fmtNum } from '../domain/format'
const flat = (d: (number | null)[]) => Object.fromEntries(d.map((x, i) => ['s' + i, x]))
export default function Linimasa() {
  const { all, raw, status, fetchSheet, asOf } = useStore(); const [reg, setReg] = useState(''); const [st, setSt] = useState(''); const [late, setLate] = useState(false)
  useEffect(() => { if (!asOf && !raw['ALL Shipment'] && !status['ALL Shipment']) fetchSheet('ALL Shipment') }, [asOf])
  const data = useMemo(() => {
    if (!all) return null
    const rows = all.ships.map(s => { const d = stepDays(s.ms); const tot = s.ms[0] != null && s.ms[9] != null && s.ms[9] >= s.ms[0] ? (s.ms[9] - s.ms[0]) / 864e5 : null; return { id: s.id, pltu: s.plant, wilayah: regionOf(s.plant), si: s.si, kapal: s.tbbg.split(';')[0], mitra: s.mitraReal, status: s.stage, d, tot, ...flat(d) } }).filter(r => r.d.some(x => x != null))
    const stats = STEPS.map((_, i) => { const v = rows.map(r => r.d[i]).filter((x): x is number => x != null).sort((a, b) => a - b); return { n: v.length, med: pctl(v, 0.5), p75: pctl(v, 0.75) } })
    const neg = all.ships.filter(s => stepDays(s.ms).some((x, i) => x == null && s.ms[i] != null && s.ms[i + 1] != null)).length
    return { rows, stats, neg }
  }, [all])
  if (!all || !data) return <Empty />
  const slow = (r: any) => r.d.some((x: number | null, i: number) => x != null && data.stats[i].p75 != null && x > data.stats[i].p75!)
  const rows = data.rows.filter(r => (!reg || r.wilayah === reg) && (!st || r.status === st) && (!late || slow(r)))
  const cell = (i: number) => (v: any) => { if (v == null) return <span className="text-slate-600">—</span>; const s = data.stats[i]; const c = s.med != null && v <= s.med ? '#34d399' : s.p75 != null && v <= s.p75 ? '#fbbf24' : '#fb7185'; return <span style={{ color: c }} className="num">{fmtNum(v, 1)}</span> }
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'si', label: 'No. SI' }, { key: 'kapal', label: 'TB/BG' }, { key: 'mitra', label: 'Mitra' }, { key: 'status', label: 'Status', fmt: v => stageLabel(v) },
    ...STEPS.map((l, i) => ({ key: 's' + i, label: l + ' (hari)', fmt: cell(i) })), { key: 'tot', label: 'SI → Selesai bongkar (hari)', fmt: v => v == null ? '—' : fmtNum(v, 1) }]
  return <>
    <div className="mb-2"><h2 className="text-sm font-semibold">Linimasa & Keterlambatan Shipment</h2><p className="text-[11px] text-slate-500">Sumber: sheet ALL Shipment (semua shipment tahun berjalan) · lama tiap tahap dalam hari, dihitung dari tanggal milestone di sheet</p></div>
    <Card><p className="text-xs text-slate-300">Penanda warna memakai pembanding statistik, bukan SLA: <span className="text-[#34d399]">hijau</span> ≤ median, <span className="text-[#fbbf24]">kuning</span> ≤ persentil ke-75, <span className="text-[#fb7185]">merah</span> lebih lama dari persentil ke-75 untuk tahap yang sama. Perbandingan ETA Rakor belum tersedia: tanggal ETA setiap Rakor belum tersimpan di sheet mana pun (perlu snapshot per Rakor).</p></Card>
    <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-9 gap-2 mb-3">{STEPS.map((l, i) => <Kpi key={l} label={l} value={data.stats[i].med == null ? '—' : fmtNum(data.stats[i].med!, 1)} unit="hari" note={`P75 ${data.stats[i].p75 == null ? '—' : fmtNum(data.stats[i].p75!, 1)} · n=${data.stats[i].n}`} accent="#e6b457" tip="Median lama tahap" />)}</div>
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs no-print"><select aria-label="Filter wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>
      <select aria-label="Filter status" value={st} onChange={e => setSt(e.target.value)}><option value="">Semua status</option>{STATUSES.filter(s => s.key !== 'carryOver').map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      <label><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} /> hanya yang melewati P75 di salah satu tahap</label><span className="text-slate-500">{rows.length} shipment</span></div>
    <Card title="Tahap per Shipment"><DataTable rows={rows} cols={cols} name="linimasa-shipment" /></Card>
    <p className="text-[11px] text-slate-500">{fmtNum(all.ships.length)} shipment terbaca; {fmtNum(data.rows.length)} punya minimal satu tahap bertanggal lengkap. {data.neg} shipment punya urutan tanggal terbalik (tahap itu dikosongkan). Tanggal di luar 2025–2027 atau format tidak dikenal dianggap kosong.</p>
  </>
}
