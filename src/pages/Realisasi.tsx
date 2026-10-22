import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { Bar, Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { BULAN, aggregatePlants, groupBy, parseMonthly, totals } from '../domain/monthly'
import { pct, sum } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { TARGET_TAHUNAN } from '../config/sources'
import { tone } from './Ringkasan'
const f = (v: any) => fmtNum(v)
const gcols: Col[] = [{ key: 'nama', label: 'Nama' }, { key: 'n', label: 'Shipment' }, { key: 'konf', label: 'Konfirmasi (MT)', fmt: f }, { key: 'co', label: 'Carry Over (MT)', fmt: f }, { key: 'bl', label: 'Loading B/L (MT)', fmt: f }, { key: 'ds', label: 'Unloading D/S (MT)', fmt: f }]
const pcols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'wilayah', label: 'Wilayah' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: f }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: f }, { key: 'bl', label: 'Loading B/L (MT)', fmt: f }, { key: 'ds', label: 'Unloading D/S (MT)', fmt: f }, { key: 'p', label: 'Pemenuhan', fmt: v => fmtPct(v) }, { key: 'n', label: 'Shipment' }]
export function RealisasiBulan() {
  const { bulan = '' } = useParams(); const { raw, status, fetchSheet } = useStore(); const d = raw[bulan]; const st = status[bulan]
  useEffect(() => { if (BULAN.includes(bulan) && !raw[bulan] && !status[bulan]) fetchSheet(bulan) }, [bulan])
  const m = useMemo(() => d?.headers ? parseMonthly({ headers: d.headers, rows: d.rows }, bulan) : null, [d, bulan])
  if (!BULAN.includes(bulan)) return <Empty text="Bulan tidak dikenal" />
  if (!m) return <Card><p className="text-xs">{st?.state === 'Gagal Diakses' ? `Gagal Mengambil Data: ${st.msg}` : 'Memuat Data…'}</p></Card>
  if (m.missing.length) return <Card title={`Sheet ${bulan}`}><p className="text-xs text-amber-300">Kolom tidak ditemukan: {m.missing.join(', ')}. Lihat <Link className="underline" to={`/sheet/${bulan}`}>data mentah</Link>.</p></Card>
  const t = totals(m.ships), keb = t.konf + t.co
  const plants = aggregatePlants(m.ships).filter(p => p.n > 0).map(p => ({ ...p, p: pct(p.ds, p.target + p.carryOver) }))
  return <>
    <div className="flex justify-between items-baseline mb-2"><h2 className="text-sm font-semibold">Realisasi {bulan} 2026</h2><span className="text-[11px] text-slate-500">diperbarui {d.at} · <Link className="text-[#e6b457]" to={`/sheet/${bulan}`}>data mentah</Link></span></div>
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
  const { raw, status, fetchSheet } = useStore()
  useEffect(() => { (async () => { for (const b of BULAN) if (!raw[b] && !status[b]) await fetchSheet(b) })() }, [])
  const rows = useMemo(() => BULAN.map(b => { const d = raw[b]; const m = d?.headers ? parseMonthly({ headers: d.headers, rows: d.rows }, b) : null; if (!m || m.missing.length) return { bulan: b, ada: false } as any; const t = totals(m.ships); return { bulan: b, ada: true, ...t, keb: t.konf + t.co, p: pct(t.ds, t.konf + t.co) } }), [raw])
  const ok = rows.filter(r => r.ada); const T = { konf: sum(ok, 'konf'), co: sum(ok, 'co'), bl: sum(ok, 'bl'), ds: sum(ok, 'ds') }
  return <>
    <h2 className="text-sm font-semibold mb-2">Ringkasan Realisasi 2026</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><Kpi label="Target Tahunan" value={fmtNum(TARGET_TAHUNAN)} unit="MT" accent="#e6b457" /><Kpi label="Complete Loading (Σ B/L)" value={fmtNum(T.bl)} unit="MT" note={`${fmtPct(pct(T.bl, TARGET_TAHUNAN))} dari target tahunan`} accent="#38bdf8" />
      <Kpi label="Complete Unloading (Σ D/S)" value={fmtNum(T.ds)} unit="MT" note={`${fmtPct(pct(T.ds, TARGET_TAHUNAN))} dari target tahunan`} accent="#34d399" /><Kpi label="Bulan Termuat" value={`${ok.length} / 12`} note={ok.length < 12 ? 'sisanya sedang dimuat atau belum ada data' : 'lengkap'} accent="#a78bfa" /></div>
    <Card title="Kebutuhan vs Loading vs Unloading per Bulan (MT)"><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={ok}><XAxis dataKey="bulan" stroke="#9aa3b2" fontSize={11} /><YAxis stroke="#9aa3b2" fontSize={11} tickFormatter={v => fmtNum(v / 1000) + ' rb'} /><Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} /><Legend />
      <RBar dataKey="keb" name="Konfirmasi + Carry Over" fill="#e6b457" /><RBar dataKey="bl" name="Loading (B/L)" fill="#38bdf8" /><RBar dataKey="ds" name="Unloading (D/S)" fill="#34d399" /></BarChart></ResponsiveContainer></div></Card>
    <Card title="Per Bulan"><table className="w-full text-xs"><thead><tr><th>Bulan</th><th>Konfirmasi</th><th>Carry Over</th><th>Loading (B/L)</th><th>Unloading (D/S)</th><th>Shipment</th><th>Pemenuhan</th><th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.bulan} className="border-t border-white/5"><td><Link className="text-[#e6b457]" to={`/realisasi/${r.bulan}`}>{r.bulan}</Link></td>{r.ada ? <><td>{fmtNum(r.konf)}</td><td>{fmtNum(r.co)}</td><td>{fmtNum(r.bl)}</td><td>{fmtNum(r.ds)}</td><td>{r.n}</td><td style={{ color: tone(r.p) }}>{fmtPct(r.p)}</td><td className="w-24"><Bar pct={r.p} color={tone(r.p)} /></td></> : <td colSpan={7} className="text-slate-500">{status[r.bulan]?.state === 'Gagal Diakses' ? 'Gagal Mengambil Data' : status[r.bulan] ? 'Memuat Data…' : 'Data Belum Tersedia'}</td>}</tr>)}</tbody></table></Card>
    <p className="text-[11px] text-slate-500">Konfirmasi = Σ Jumlah berkonfirmasi bulan tersebut; Carry Over = Σ Jumlah berkonfirmasi Carry Over; Loading = Σ B/L; Unloading = Σ D/S. Target tahunan dari sheet (dapat diubah di konfigurasi).</p>
  </>
}
