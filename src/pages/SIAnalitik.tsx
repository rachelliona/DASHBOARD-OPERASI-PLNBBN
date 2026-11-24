import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Kpi, PageHead } from '../components/ui'
import { useSI } from '../si/store'
import { SI } from '../si/types'
import { fmtNomor } from '../si/logic'
import { LOKASI_ROWS } from '../config/lokasi'

export type TabAnalitik = 'dashboard' | 'rekap' | 'plot' | 'peta'
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const PRIO: Record<string, number> = { sistem: 0, databas: 1, 'sheet-2026': 2 }
const nf = (n: number) => Math.round(n).toLocaleString('id-ID')
const rapi = (s?: string) => (s || '').replace(/\s+/g, ' ').replace(/^(duks|jetty)\s+/i, '').split(',')[0].trim()
const kunci = (s: string) => s.toLowerCase().replace(/\b(pltu|duks|pt|unit|tuks|jetty)\b/g, '').replace(/[^a-z0-9]/g, '')
const LOK = LOKASI_ROWS.map(l => ({ ...l, k: kunci(l.nama) })).filter(l => l.k)
const cariLok = (nama: string) => { const k = kunci(nama); if (!k) return null; return LOK.find(l => l.k === k) || LOK.find(l => l.k.length > 3 && (k.includes(l.k) || l.k.includes(k))) || null }

/** Semua SI yang pernah ada: sistem + database + sheet, satu per nomor, tanpa tombstone/pengajuan. */
function semuaSI(rows: SI[]): SI[] {
  const m = new Map<string, SI>()
  for (const r of rows) {
    if (r.nomor == null || r.tahap === 'batal' || r.tahap === 'pengajuan') continue
    const k = r.tahun + ':' + r.nomor, a = m.get(k)
    if (!a || (PRIO[r.sumber] ?? 3) < (PRIO[a.sumber] ?? 3)) m.set(k, r)
  }
  return [...m.values()].sort((a, b) => a.tahun - b.tahun || (a.nomor! - b.nomor!))
}
const bulanKey = (r: SI) => (r.tanggal && r.tanggal.length >= 7 ? r.tanggal.slice(0, 7) : '')
const pltuNama = (r: SI) => rapi(r.bongkar || r.pltu) || '—'
const tambangNama = (r: SI) => (r.tambang || r.mitra || '—').trim()
function hitung(data: SI[], f: (r: SI) => string) {
  const m = new Map<string, { k: string; n: number; rev: number; vol: number; lab: Map<string, number> }>()
  for (const r of data) { const lab = f(r) || '—'; const k = lab.toLowerCase().replace(/[^a-z0-9]/g, '') || lab; const e = m.get(k) || { k: lab, n: 0, rev: 0, vol: 0, lab: new Map() }; e.n++; if (r.revisiKe > 0) e.rev++; e.vol += +(r.volume ?? 0) || 0; e.lab.set(lab, (e.lab.get(lab) || 0) + 1); m.set(k, e) }
  return [...m.values()].map(e => ({ k: [...e.lab.entries()].sort((a, b) => b[1] - a[1])[0][0], n: e.n, rev: e.rev, vol: e.vol })).sort((a, b) => b.n - a.n || b.vol - a.vol)
}
const csvUnduh = (data: SI[]) => {
  const q = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const h = ['Nomor SI', 'Tahun', 'Tanggal', 'Pemohon', 'Shipper/Mitra', 'Tambang', 'Transporter', 'Kapal', 'Volume (ton)', 'Pelabuhan Muat', 'Laycan Mulai', 'Laycan Selesai', 'ETA Mulai', 'ETA Selesai', 'PLTU Tujuan', 'Revisi ke', 'Sumber']
  const b = data.map(r => [fmtNomor(r.nomor, r.tahun), r.tahun, r.tanggal, r.pemohon, r.mitra, r.tambang, r.transporter, r.kapal, r.volume, r.muat, r.laycanMulai, r.laycanSelesai, r.etaMulai, r.etaSelesai, r.bongkar || r.pltu, r.revisiKe, r.sumber].map(q).join(','))
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [h.map(q).join(','), ...b].join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'rekap-semua-SI.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000)
}

function Batang({ items, nilai, fmt = nf, warna = '#e6b457' }: { items: { k: string; n: number; vol: number }[]; nilai: 'n' | 'vol'; fmt?: (n: number) => string; warna?: string }) {
  const max = Math.max(1, ...items.map(i => i[nilai]))
  return <div className="space-y-1.5">{items.map(i => <div key={i.k} className="flex items-center gap-2 text-[12px]"><div className="w-36 md:w-52 truncate text-slate-200" title={i.k}>{i.k}</div><div className="flex-1 h-5 rounded bg-white/5 overflow-hidden"><div style={{ width: (i[nilai] / max * 100) + '%', background: `linear-gradient(90deg, ${warna}55, ${warna})` }} className="h-full" /></div><div className="w-20 text-right font-mono text-slate-100">{fmt(i[nilai])}</div></div>)}</div>
}
function Rekap({ judul, items, semua }: { judul: string; items: ReturnType<typeof hitung>; semua?: boolean }) {
  const [all, setAll] = useState(!!semua); const tampil = all ? items : items.slice(0, 12)
  return <Card title={`${judul} (${items.length})`}><div className="overflow-x-auto"><table className="tbl-si w-full text-[12.5px]"><thead><tr><th>{judul.replace(/^Per /, '')}</th><th>SI</th><th>Revisi</th><th>Volume (ton)</th></tr></thead><tbody>{tampil.map(i => <tr key={i.k} className="baris-si"><td className="px-2 !text-left" style={{ textAlign: 'left' }}>{i.k}</td><td className="px-2 text-center font-mono">{nf(i.n)}</td><td className="px-2 text-center font-mono">{i.rev ? nf(i.rev) : '—'}</td><td className="px-2 text-right font-mono">{i.vol ? nf(i.vol) : '—'}</td></tr>)}</tbody></table></div>{items.length > 12 && <button className="fchip mt-2" onClick={() => setAll(!all)}>{all ? 'Ringkas' : `Tampilkan semua (${items.length})`}</button>}</Card>
}

const JUDUL: Record<TabAnalitik, string> = { dashboard: 'Dashboard SI', rekap: 'Rekap SI', plot: 'Plot SI', peta: 'Peta SI' }
export default function SIAnalitik({ tab }: { tab: TabAnalitik }) {
  const st = useSI(); const semua = useMemo(() => semuaSI(st.rows), [st.rows])
  const tahunList = useMemo(() => [...new Set(semua.map(r => r.tahun))].sort((a, b) => b - a), [semua])
  const [th, setTh] = useState('semua'); const data = useMemo(() => th === 'semua' ? semua : semua.filter(r => String(r.tahun) === th), [semua, th])
  const tot = useMemo(() => ({ n: data.length, rev: data.filter(r => r.revisiKe > 0).length, vol: data.reduce((a, r) => a + (+(r.volume ?? 0) || 0), 0) }), [data])
  const perBulan = useMemo(() => { const m = new Map<string, { k: string; n: number; vol: number; rev: number }>(); for (const r of data) { const k = bulanKey(r); if (!k) continue; const e = m.get(k) || { k, n: 0, vol: 0, rev: 0 }; e.n++; e.vol += +(r.volume ?? 0) || 0; if (r.revisiKe > 0) e.rev++; m.set(k, e) } return [...m.values()].sort((a, b) => a.k.localeCompare(b.k)) }, [data])
  const label = (k: string) => BLN[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4)
  const perTambang = useMemo(() => hitung(data, tambangNama), [data]), perPltu = useMemo(() => hitung(data, pltuNama), [data])
  const perPemohon = useMemo(() => hitung(data, r => (r.pemohon || '—')), [data]), perTrans = useMemo(() => hitung(data, r => (r.transporter || '—').replace(/^PT\.?\s+/i, '')), [data])
  const perTahun = useMemo(() => hitung(semua, r => String(r.tahun)).sort((a, b) => +b.k - +a.k), [semua])
  const titik = useMemo(() => perPltu.map(p => ({ ...p, l: cariLok(p.k) })), [perPltu])
  const filter = <select value={th} onChange={e => setTh(e.target.value)} aria-label="Tahun"><option value="semua">Semua tahun</option>{tahunList.map(t => <option key={t} value={String(t)}>{t}</option>)}</select>
  return <div className="space-y-4">
    <PageHead title={JUDUL[tab]} sub="Semua SI yang pernah terbit: dibuat di dashboard, arsip database lama, dan sheet monitoring." right={<div className="flex gap-2 flex-wrap">{filter}<button className="fchip" onClick={() => csvUnduh(data)}>⬇ CSV semua SI</button></div>} />
    {!semua.length && <Card><p className="text-sm text-slate-300">Registri SI masih kosong. Buka menu Shipping Instruction → Sinkron & impor dulu.</p></Card>}
    {(tab === 'dashboard' || tab === 'rekap') && <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi label="Total SI" value={nf(tot.n)} note={th === 'semua' ? 'sejak awal' : 'tahun ' + th} /><Kpi label="Revisi" value={nf(tot.rev)} note={tot.n ? (tot.rev / tot.n * 100).toFixed(1) + '% dari SI' : ''} /><Kpi label="Volume" value={nf(tot.vol / 1000)} unit="rb ton" note="total tertulis di SI" /><Kpi label="PLTU / tambang" value={`${nf(perPltu.length)} / ${nf(perTambang.length)}`} note="tujuan / asal unik" /></div>}
    {tab === 'dashboard' && <>
      <Card title="SI per bulan"><div className="flex items-end gap-1 h-40 overflow-x-auto">{perBulan.map(b => { const max = Math.max(1, ...perBulan.map(x => x.n)); return <div key={b.k} className="flex flex-col items-center justify-end h-full min-w-[26px] flex-1" title={`${label(b.k)}: ${b.n} SI, ${b.rev} revisi`}><span className="text-[10px] text-slate-300">{b.n}</span><div style={{ height: (b.n / max * 100) + '%', background: 'linear-gradient(180deg,#e6b457,#b9822a)' }} className="w-full rounded-t min-h-[2px]" /><span className="text-[9px] text-slate-400 mt-1 whitespace-nowrap">{label(b.k)}</span></div> })}</div></Card>
      <div className="grid md:grid-cols-2 gap-4"><Card title="10 tambang / mitra terbanyak"><Batang items={perTambang.slice(0, 10)} nilai="n" /></Card><Card title="10 PLTU tujuan terbanyak"><Batang items={perPltu.slice(0, 10)} nilai="n" warna="#5fb3d9" /></Card></div>
      <Card title="Per tahun"><div className="overflow-x-auto"><table className="tbl-si w-full text-[12.5px]"><thead><tr><th>Tahun</th><th>SI</th><th>Revisi</th><th>Volume (ton)</th></tr></thead><tbody>{perTahun.map(i => <tr key={i.k} className="baris-si"><td className="px-2 text-center">{i.k}</td><td className="px-2 text-center font-mono">{nf(i.n)}</td><td className="px-2 text-center font-mono">{nf(i.rev)}</td><td className="px-2 text-right font-mono">{nf(i.vol)}</td></tr>)}</tbody></table></div></Card></>}
    {tab === 'rekap' && <><div className="grid md:grid-cols-2 gap-4"><Rekap judul="Per Tambang / Mitra" items={perTambang} /><Rekap judul="Per PLTU Tujuan" items={perPltu} /><Rekap judul="Per Pemohon" items={perPemohon} semua /><Rekap judul="Per Transporter" items={perTrans} /></div>
      <Card title={`Rekap per bulan (${perBulan.length})`}><div className="overflow-x-auto"><table className="tbl-si w-full text-[12.5px]"><thead><tr><th>Bulan</th><th>SI</th><th>Revisi</th><th>Volume (ton)</th></tr></thead><tbody>{[...perBulan].reverse().map(b => <tr key={b.k} className="baris-si"><td className="px-2 text-center">{label(b.k)} 20{b.k.slice(2, 4)}</td><td className="px-2 text-center font-mono">{nf(b.n)}</td><td className="px-2 text-center font-mono">{b.rev || '—'}</td><td className="px-2 text-right font-mono">{b.vol ? nf(b.vol) : '—'}</td></tr>)}</tbody></table></div></Card></>}
    {tab === 'plot' && <><Card title="SI per bulan (jumlah)"><Batang items={perBulan.map(b => ({ k: label(b.k) + ' 20' + b.k.slice(2, 4), n: b.n, vol: b.vol }))} nilai="n" /></Card>
      <Card title="Volume per bulan (ton)"><Batang items={perBulan.map(b => ({ k: label(b.k) + ' 20' + b.k.slice(2, 4), n: b.n, vol: b.vol }))} nilai="vol" warna="#7bd88f" /></Card>
      <div className="grid md:grid-cols-2 gap-4"><Card title="Tambang / mitra — volume (ton)"><Batang items={[...perTambang].sort((a, b) => b.vol - a.vol).slice(0, 15)} nilai="vol" warna="#7bd88f" /></Card><Card title="PLTU tujuan — volume (ton)"><Batang items={[...perPltu].sort((a, b) => b.vol - a.vol).slice(0, 15)} nilai="vol" warna="#5fb3d9" /></Card><Card title="Pemohon — jumlah SI"><Batang items={perPemohon.slice(0, 15)} nilai="n" warna="#c99cf0" /></Card><Card title="Transporter — jumlah SI"><Batang items={perTrans.slice(0, 15)} nilai="n" warna="#f0907a" /></Card></div></>}
    {tab === 'peta' && <><Card title="PLTU tujuan SI (lingkaran = jumlah SI)"><div className="h-[62vh] min-h-[360px] rounded-xl overflow-hidden border border-white/10"><MapContainer center={[-2.5, 118]} zoom={5} style={{ height: '100%', width: '100%' }}><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {titik.filter(t => t.l).map(t => <CircleMarker key={t.k} center={[t.l!.lat, t.l!.lon]} radius={Math.max(5, Math.min(26, 4 + Math.sqrt(t.n) * 2.2))} pathOptions={{ color: '#fff', weight: 1, fillColor: '#e6b457', fillOpacity: .75 }}><Tooltip><b>{t.k}</b><br />{nf(t.n)} SI · {nf(t.vol)} ton{t.rev ? ` · ${t.rev} revisi` : ''}</Tooltip></CircleMarker>)}</MapContainer></div></Card>
      <Card title={`PLTU belum ada koordinat (${titik.filter(t => !t.l).length})`}><ul className="text-xs max-h-48 overflow-auto columns-1 md:columns-2">{titik.filter(t => !t.l).map(t => <li key={t.k}>{t.k} — {nf(t.n)} SI</li>)}</ul></Card></>}
  </div>
}
