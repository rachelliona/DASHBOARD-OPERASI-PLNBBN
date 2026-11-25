import { useEffect, useMemo, useState, ReactNode } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Btn, Card, Kpi, PageHead } from '../components/ui'
import { SOURCES } from '../config/sources'
import { LOKASI_ROWS } from '../config/lokasi'
import { QShip, avg, coaStatus, hariSejak, parseKualitas } from '../domain/kualitas'
import { kunci, useDurasi } from '../domain/durasi'
import { todayRef } from '../domain/insight'
import { pdfPemasok, pdfTransport } from '../kualitas/pdf'

export type TabK = 'monitoring' | 'peta' | 'evaluasi'
const nf = (n: number | null, d = 0) => n == null ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d })
const fd = (t: number | null) => t == null ? '—' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' }).format(t)
let cache: Promise<QShip[]> | null = null
const muat = (force = false) => { if (force) cache = null; return (cache ??= fetch(SOURCES.find(s => s.name === 'ALL Shipment')!.url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() }).then(parseKualitas).catch(e => { cache = null; throw e })) }
const LOK = LOKASI_ROWS.map(l => ({ ...l, k: kunci(l.nama) })).filter(l => l.k)
const cariLok = (nama: string) => { const k = kunci(nama); if (!k) return null; return LOK.find(l => l.k === k) || LOK.find(l => l.k.length > 3 && (k.includes(l.k) || l.k.includes(k))) || null }
const warna = (d: number) => { const t = Math.max(0, Math.min(1, d / 250)); return `hsl(${Math.round(55 - 55 * t)},${85}%,${52 - 8 * t}%)` }

function Modal({ judul, onClose, children }: { judul: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [])
  return <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-3" onClick={onClose}><div className="gcard max-w-5xl w-full max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
    <div className="flex justify-between items-center mb-3 gap-2"><h2 className="gcard-t">{judul}</h2><Btn onClick={onClose}>Tutup</Btn></div>{children}</div></div>
}
function Tabel({ rows, today, max = 300 }: { rows: QShip[]; today: number; max?: number }) {
  return <div className="overflow-x-auto"><table className="tbl-si w-full text-xs"><thead><tr><th>PLTU</th><th>Mitra</th><th>No. SI</th><th>Selesai bongkar</th><th>H+</th><th>GCV muat</th><th>GCV bongkar</th><th>Susut</th><th>TM m→b</th><th>Ash m→b</th></tr></thead><tbody>
    {rows.slice(0, max).map((s, i) => <tr key={i}><td>{s.plant}</td><td>{s.mitra || '—'}</td><td>{s.si || '—'}</td><td>{fd(s.selesaiBongkar)}</td><td>{hariSejak(s, today) ?? '—'}</td><td>{nf(s.gcvL)}</td><td>{nf(s.gcvU)}</td>
      <td style={{ color: s.turun != null && s.turun > 150 ? '#f87171' : undefined }}>{s.turun == null ? '—' : nf(s.turun)}</td><td>{nf(s.tmL, 1)} → {nf(s.tmU, 1)}</td><td>{nf(s.ashL, 1)} → {nf(s.ashU, 1)}</td></tr>)}</tbody></table>
    {rows.length > max && <p className="text-[11px] text-slate-400 mt-2">Menampilkan {max} dari {nf(rows.length)} baris.</p>}{!rows.length && <p className="text-xs text-slate-400">Tidak ada data.</p>}</div>
}
export default function Kualitas({ tab }: { tab: TabK }) {
  const [ships, setShips] = useState<QShip[] | null>(null); const [err, setErr] = useState(''); const [pop, setPop] = useState<{ t: string; rows: QShip[] } | null>(null); const [cari, setCari] = useState('')
  const today = todayRef(); const dur = useDurasi()
  useEffect(() => { muat().then(setShips).catch(e => setErr(e.message)) }, [])
  const reload = () => { setShips(null); setErr(''); muat(true).then(setShips).catch(e => setErr(e.message)) }
  const st = useMemo(() => {
    const a = ships ?? []; const by = (k: string) => a.filter(s => coaStatus(s, today) === k)
    const ada = by('ada'), jend = by('jendela'), telat = by('telat'), belum = by('belum')
    const dengan = a.filter(s => s.turun != null); const besar = dengan.filter(s => s.turun! > 150)
    return { a, ada, jend, telat, belum, dengan, besar, avgDrop: avg(dengan.map(s => s.turun)), ready: a.filter(s => s.selesaiBongkar != null && today >= s.selesaiBongkar - 2 * 864e5) }
  }, [ships, today])
  const peta = useMemo(() => { const m = new Map<string, QShip[]>(); st.dengan.forEach(s => m.set(s.plant, [...(m.get(s.plant) ?? []), s])); return [...m].map(([p, a]) => ({ p, a, n: a.length, drop: avg(a.map(s => s.turun))!, gl: avg(a.map(s => s.gcvL)), gu: avg(a.map(s => s.gcvU)), lok: cariLok(p) })).sort((x, y) => y.drop - x.drop) }, [st.dengan])
  const rute = useMemo(() => { const m = new Map<string, QShip[]>(); st.dengan.forEach(s => { if (s.sumber) { const k = s.sumber + '→' + s.plant; m.set(k, [...(m.get(k) ?? []), s]) } }); return [...m].map(([k, a]) => ({ k, n: a.length, drop: avg(a.map(s => s.turun))! })).filter(r => r.n >= 2).sort((x, y) => y.drop - x.drop).slice(0, 15) }, [st.dengan])
  const [q, setQ] = useState(Math.floor(new Date(today).getUTCMonth() / 3) + 1); const [thn, setThn] = useState(new Date(today).getUTCFullYear())
  const unduh = (doc: any, nama: string) => doc.save(nama)
  const list = useMemo(() => st.a.filter(s => (s.gcvL != null || s.gcvU != null) && (!cari || (s.plant + s.mitra + s.si + s.sumber).toLowerCase().includes(cari.toLowerCase()))).sort((a, b) => (b.selesaiBongkar ?? 0) - (a.selesaiBongkar ?? 0)), [st.a, cari])
  return <div className="space-y-4">
    <PageHead title="Kualitas Batubara" sub={<>Sumber: sheet ALL Shipment (Monitoring Pasokan DitOperasi PLNBBN 2026) · GCV/TM/Ash muat → bongkar · CoA bongkar dinilai siap bila GCV unload terisi, jendela pengisian H-2 s.d. H+7 dari tanggal selesai bongkar</>} right={<Btn onClick={reload}>Muat ulang</Btn>} />
    {err && <Card><p className="text-xs text-amber-300">Gagal memuat ALL Shipment: {err}</p></Card>}{!ships && !err && <Card><p className="text-xs text-slate-400">Memuat data kualitas…</p></Card>}
    {ships && tab === 'monitoring' && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Shipment ber-CoA muat" value={nf(st.a.filter(s => s.gcvL != null).length)} note="GCV muat terisi" accent="#38bdf8" onClick={() => setPop({ t: 'Shipment dengan CoA muat', rows: st.a.filter(s => s.gcvL != null) })} />
        <Kpi label="CoA bongkar sudah ada" value={nf(st.ada.length)} note={`dari ${nf(st.ready.length)} yang sudah mencapai H-2 selesai bongkar`} accent="#34d399" onClick={() => setPop({ t: 'CoA bongkar sudah ada', rows: st.ada })} />
        <Kpi label="Menunggu CoA (H-2…H+7)" value={nf(st.jend.length)} note="masih dalam jendela" accent="#fbbf24" onClick={() => setPop({ t: 'Menunggu CoA bongkar (dalam jendela H-2 s.d. H+7)', rows: st.jend })} />
        <Kpi label="CoA telat (> H+7)" value={nf(st.telat.length)} note="lewat jendela, CoA belum terisi" accent="#f87171" onClick={() => setPop({ t: 'CoA bongkar telat (lebih dari H+7)', rows: st.telat })} />
        <Kpi label="Belum waktunya" value={nf(st.belum.length)} note="selesai bongkar > 2 hari lagi" accent="#94a3b8" onClick={() => setPop({ t: 'Belum waktunya (sebelum H-2)', rows: st.belum })} />
        <Kpi label="Rata-rata susut GCV" value={nf(st.avgDrop)} unit="kcal/kg" note={`dari ${nf(st.dengan.length)} shipment ber-CoA muat & bongkar`} accent="#fb7185" onClick={() => setPop({ t: 'Shipment dengan susut GCV (terbesar dulu)', rows: [...st.dengan].sort((a, b) => b.turun! - a.turun!) })} />
        <Kpi label="Susut GCV > 150" value={nf(st.besar.length)} note="kcal/kg muat → bongkar" accent="#ef4444" onClick={() => setPop({ t: 'Susut GCV > 150 kcal/kg', rows: [...st.besar].sort((a, b) => b.turun! - a.turun!) })} />
        <Kpi label="Total baris data" value={nf(st.a.length)} note="shipment terbaca" accent="#64748b" onClick={() => setPop({ t: 'Semua shipment terbaca', rows: st.a })} />
      </div>
      <Card title="Daftar Pengiriman (muat → bongkar)" right={<input className="inp text-xs" placeholder="Cari PLTU / mitra / SI" value={cari} onChange={e => setCari(e.target.value)} />}><Tabel rows={list} today={today} /></Card></>}
    {ships && tab === 'peta' && <>
      <Card title="Peta Penurunan Kalori (GCV muat → bongkar)"><p className="text-[11px] text-slate-400 mb-2">Makin merah &amp; besar lingkaran = rata-rata penurunan GCV makin besar. Skala merah penuh ≥ 250 kcal/kg.</p>
        <div className="h-[62vh] min-h-[360px] rounded-xl overflow-hidden border border-white/10"><MapContainer bounds={[[-11.5, 94], [6.5, 141.5]]} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {peta.filter(p => p.lok).map(p => <CircleMarker key={p.p} center={[p.lok!.lat, p.lok!.lon]} radius={6 + Math.min(18, Math.max(0, p.drop) / 12)} pathOptions={{ color: '#111', weight: 1, fillColor: warna(p.drop), fillOpacity: 0.85 }} eventHandlers={{ click: () => setPop({ t: `${p.p} · susut rata-rata ${nf(p.drop)} kcal/kg`, rows: [...p.a].sort((a, b) => b.turun! - a.turun!) }) }}><Tooltip>{p.p} · muat {nf(p.gl)} → bongkar {nf(p.gu)} · susut {nf(p.drop)} kcal/kg · {p.n} shipment</Tooltip></CircleMarker>)}</MapContainer></div>
        <p className="text-[11px] text-slate-400 mt-2">Tanpa koordinat di master lokasi: {peta.filter(p => !p.lok).map(p => p.p).join(', ') || '—'}</p></Card>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Penurunan GCV per PLTU"><div className="space-y-1.5">{peta.slice(0, 20).map(p => <div key={p.p} className="text-xs"><div className="flex justify-between"><span>{p.p} <span className="text-slate-500">({p.n})</span></span><b>{nf(p.drop)}</b></div><div className="h-2 rounded bg-white/10"><div className="h-2 rounded" style={{ width: Math.min(100, Math.max(2, p.drop / 3)) + '%', background: warna(p.drop) }} /></div></div>)}</div></Card>
        <Card title="Sumber Tambang → PLTU (susut terbesar, min. 2 shipment)"><div className="space-y-1.5">{rute.map(p => <div key={p.k} className="text-xs"><div className="flex justify-between gap-2"><span>{p.k.replace('→', ' → ')} <span className="text-slate-500">({p.n})</span></span><b>{nf(p.drop)}</b></div><div className="h-2 rounded bg-white/10"><div className="h-2 rounded" style={{ width: Math.min(100, Math.max(2, p.drop / 3)) + '%', background: warna(p.drop) }} /></div></div>)}{!rute.length && <p className="text-xs text-slate-400">Belum cukup data.</p>}</div></Card></div></>}
    {tab === 'evaluasi' && <Card title="Evaluasi Kinerja Mitra (PDF)">
      <p className="text-xs text-slate-400 mb-3">Format mengikuti formulir Excel: Mitra Transport (data DURASI BBN-BAG: ETA rencana vs realisasi, shortage) dan Mitra Pemasok batubara (ALL Shipment: volume DS, kualitas bongkar, score, kategori). Tanda tangan: Catur Aji Nugroho &amp; Rully Indra.</p>
      <div className="flex flex-wrap gap-2 items-center mb-3"><label className="text-xs">Triwulan <select className="inp" value={q} onChange={e => setQ(+e.target.value)}>{[1, 2, 3, 4].map(i => <option key={i} value={i}>TW {i}</option>)}</select></label>
        <label className="text-xs">Tahun <input className="inp w-20" type="number" value={thn} onChange={e => setThn(+e.target.value)} /></label></div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="gcard"><h3 className="gcard-t mb-1">Mitra Transport</h3><p className="text-xs text-slate-400 mb-2">{dur.rows ? `${nf(dur.rows.length)} shipment terbaca dari sheet durasi` : dur.err ? 'Gagal memuat: ' + dur.err : 'Memuat data durasi…'}</p>
          <Btn disabled={!dur.rows} onClick={() => { const r = pdfTransport(dur.rows!, q, thn); unduh(r.doc, `Evaluasi-Mitra-Transport-TW${q}-${thn}.pdf`) }}>⬇ Unduh PDF Mitra Transport</Btn></div>
        <div className="gcard"><h3 className="gcard-t mb-1">Mitra Batubara (Pemasok)</h3><p className="text-xs text-slate-400 mb-2">{ships ? `${nf(st.a.length)} shipment terbaca dari ALL Shipment` : err ? 'Gagal memuat' : 'Memuat…'}</p>
          <Btn disabled={!ships} onClick={() => { const r = pdfPemasok(ships!, q, thn); unduh(r.doc, `Evaluasi-Mitra-Pemasok-TW${q}-${thn}.pdf`) }}>⬇ Unduh PDF Mitra Batubara</Btn></div></div></Card>}
    {pop && <Modal judul={`${pop.t} (${nf(pop.rows.length)})`} onClose={() => setPop(null)}><Tabel rows={pop.rows} today={today} /></Modal>}
  </div>
}
