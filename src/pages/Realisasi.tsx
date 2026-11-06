import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CalendarRange, TrendingUp } from 'lucide-react'
import { TIP, AXIS } from '../components/chartTheme'
import { useStore } from '../store'
import { Bar, Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { BULAN, aggregatePlants, groupBy, parseMonthly, totals } from '../domain/monthly'
import { pct, sum } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { TARGET_TAHUNAN } from '../config/sources'
import { tone } from '../domain/view'
const f = (v: any) => fmtNum(v)
const gcols: Col[] = [{ key: 'nama', label: 'Nama' }, { key: 'n', label: 'Shipment' }, { key: 'konf', label: 'Konfirmasi (MT)', fmt: f }, { key: 'co', label: 'Carry Over (MT)', fmt: f }, { key: 'bl', label: 'Loading B/L (MT)', fmt: f }, { key: 'ds', label: 'Unloading D/S (MT)', fmt: f }]
const pcols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: f }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: f }, { key: 'bl', label: 'Loading B/L (MT)', fmt: f }, { key: 'ds', label: 'Unloading D/S (MT)', fmt: f }, { key: 'p', label: 'Pemenuhan', fmt: v => fmtPct(v) }, { key: 'n', label: 'Shipment' }]
export function RealisasiBulan() {
  const { bulan = '' } = useParams(); const { months, asOf, raw, status, fetchSheet } = useStore(); const st = status[bulan]; const m = months[bulan] ?? null
  useEffect(() => { if (!asOf && BULAN.includes(bulan) && !raw[bulan] && !status[bulan]) fetchSheet(bulan) }, [bulan, asOf])
  if (!BULAN.includes(bulan)) return <Empty text="Bulan tidak dikenal" />
  if (!m) return <Card><p className="text-xs">{asOf ? 'Data Belum Tersedia pada tanggal ini.' : st?.state === 'Gagal Diakses' ? `Gagal Mengambil Data: ${st.msg}` : 'Memuat Data…'}</p></Card>
  if (m.missing.length) return <Card title={`Sheet ${bulan}`}><p className="text-xs text-amber-300">Kolom tidak ditemukan: {m.missing.join(', ')}. Lihat <Link className="underline" to={`/sheet/${bulan}`}>data mentah</Link>.</p></Card>
  const t = totals(m.ships), keb = t.konf + t.co
  const plants = aggregatePlants(m.ships).filter(p => p.n > 0).map(p => ({ ...p, p: pct(p.ds, p.target + p.carryOver) }))
  return <>
    <PageHead icon={CalendarRange} color="#34d399" title={`Realisasi ${bulan} 2026`} sub={<>diperbarui {m.at} · <Link className="text-[#e6b457]" to={`/sheet/${bulan}`}>data mentah</Link></>} right={<div className="ring" style={{ ['--p' as any]: Math.min(100, pct(t.ds, keb) ?? 0), ['--t' as any]: tone(pct(t.ds, keb)) }}><span style={{ color: tone(pct(t.ds, keb)) }}>{pct(t.ds, keb) == null ? '—' : Math.round(pct(t.ds, keb) as number) + '%'}</span></div>} />
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
      <Kpi label="Konfirmasi" value={fmtNum(t.konf)} unit="MT" accent="#e6b457" /><Kpi label="Carry Over" value={fmtNum(t.co)} unit="MT" accent="#fb7185" />
      <Kpi label="Complete Loading (B/L)" value={fmtNum(t.bl)} unit="MT" note={fmtPct(pct(t.bl, keb))} accent="#38bdf8" /><Kpi label="Complete Unloading (D/S)" value={fmtNum(t.ds)} unit="MT" note={fmtPct(pct(t.ds, keb))} accent="#34d399" />
      <Kpi label="Shipment" value={fmtNum(t.n)} note={`${m.skipped} baris kosong dilewati`} accent="#a78bfa" /></div>
    <Card title="Per PLTU"><DataTable rows={plants} cols={pcols} name={`realisasi-pltu-${bulan}`} /></Card>
    <div className="grid lg:grid-cols-2 gap-3"><Card title="Per Mitra (Mitra Real.)"><DataTable rows={groupBy(m.ships, s => s.mitraReal)} cols={gcols} name={`realisasi-mitra-${bulan}`} /></Card>
      <Card title="Per Sumber Tambang"><DataTable rows={groupBy(m.ships, s => s.sumber)} cols={gcols} name={`realisasi-tambang-${bulan}`} /></Card></div>
    <p className="text-[11px] text-slate-500">Rekonsiliasi dengan baris Subtotal sheet — B/L: selisih {fmtNum(t.bl - m.sub.bl, 3)} MT · D/S: selisih {fmtNum(t.ds - m.sub.ds, 3)} MT · Jumlah: selisih {fmtNum(sum(m.ships.map(s => ({ j: s.jumlah ?? 0 })), 'j') - m.sub.jumlah, 3)} MT.</p>
  </>
}
export function RealisasiRingkasan() {
  const { months, asOf, raw, status, fetchSheet } = useStore()
  useEffect(() => { if (asOf) return; (async () => { for (const b of BULAN) if (!raw[b] && !status[b]) await fetchSheet(b) })() }, [asOf])
  const rows = useMemo(() => BULAN.map(b => { const m = months[b]; if (!m || m.missing.length) return { bulan: b, ada: false } as any; const t = totals(m.ships); return { bulan: b, ada: true, ...t, keb: t.konf + t.co, p: pct(t.ds, t.konf + t.co) } }), [months])
  const ok = rows.filter(r => r.ada); const T = { konf: sum(ok, 'konf'), co: sum(ok, 'co'), bl: sum(ok, 'bl'), ds: sum(ok, 'ds') }
  return <>
    <PageHead icon={TrendingUp} color="#34d399" title="Ringkasan Realisasi 2026" sub={`Target tahunan ${fmtNum(TARGET_TAHUNAN)} MT · ${ok.length} dari 12 bulan termuat`} right={<div className="ring" style={{ ['--p' as any]: Math.min(100, pct(T.ds, TARGET_TAHUNAN) ?? 0), ['--t' as any]: tone(pct(T.ds, TARGET_TAHUNAN)) }}><span style={{ color: tone(pct(T.ds, TARGET_TAHUNAN)) }}>{pct(T.ds, TARGET_TAHUNAN) == null ? '—' : Math.round(pct(T.ds, TARGET_TAHUNAN) as number) + '%'}</span></div>} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><Kpi label="Target Tahunan" value={fmtNum(TARGET_TAHUNAN)} unit="MT" accent="#e6b457" /><Kpi label="Complete Loading (Σ B/L)" value={fmtNum(T.bl)} unit="MT" note={`${fmtPct(pct(T.bl, TARGET_TAHUNAN))} dari target tahunan`} accent="#38bdf8" />
      <Kpi label="Complete Unloading (Σ D/S)" value={fmtNum(T.ds)} unit="MT" note={`${fmtPct(pct(T.ds, TARGET_TAHUNAN))} dari target tahunan`} accent="#34d399" /><Kpi label="Bulan Termuat" value={`${ok.length} / 12`} note={ok.length < 12 ? 'sisanya sedang dimuat atau belum ada data' : 'lengkap'} accent="#a78bfa" /></div>
    <Card title="Kebutuhan vs Loading vs Unloading per Bulan (MT)"><div style={{ height: 270 }}><ResponsiveContainer><BarChart data={ok} barGap={3} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><defs>{[['k', '#fbbf24'], ['b', '#38bdf8'], ['d', '#34d399']].map(([i, c]) => <linearGradient key={i} id={'g' + i} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={c} stopOpacity={0.35} /></linearGradient>)}</defs><CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" /><XAxis dataKey="bulan" {...AXIS} /><YAxis {...AXIS} tickFormatter={v => fmtNum(v / 1000) + ' rb'} /><Tooltip {...TIP} formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      <RBar dataKey="keb" name="Konfirmasi + Carry Over" fill="url(#gk)" radius={[6, 6, 0, 0]} /><RBar dataKey="bl" name="Loading (B/L)" fill="url(#gb)" radius={[6, 6, 0, 0]} /><RBar dataKey="ds" name="Unloading (D/S)" fill="url(#gd)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    <Card title="Per Bulan"><div className="tbw overflow-auto"><table className="rt w-full text-xs"><thead className="thd"><tr className="[&>th]:p-2"><th>Bulan</th><th>Konfirmasi</th><th>Carry Over</th><th>Loading (B/L)</th><th>Unloading (D/S)</th><th>Shipment</th><th>Pemenuhan</th><th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.bulan} className="trow [&>td]:p-2"><td><Link className="text-[#e6b457]" to={`/realisasi/${r.bulan}`}>{r.bulan}</Link></td>{r.ada ? <><td>{fmtNum(r.konf)}</td><td>{fmtNum(r.co)}</td><td>{fmtNum(r.bl)}</td><td>{fmtNum(r.ds)}</td><td>{r.n}</td><td style={{ color: tone(r.p) }}>{fmtPct(r.p)}</td><td className="w-24"><Bar pct={r.p} color={tone(r.p)} /></td></> : <td colSpan={7} className="text-slate-500">{asOf ? 'Data Belum Tersedia' : status[r.bulan]?.state === 'Gagal Diakses' ? 'Gagal Mengambil Data' : status[r.bulan] ? 'Memuat Data…' : 'Data Belum Tersedia'}</td>}</tr>)}</tbody></table></div></Card>
    <p className="text-[11px] text-slate-500">Konfirmasi = Σ Jumlah berkonfirmasi bulan tersebut; Carry Over = Σ Jumlah berkonfirmasi Carry Over; Loading = Σ B/L; Unloading = Σ D/S. Target tahunan dari sheet (dapat diubah di konfigurasi).</p>
  </>
}
