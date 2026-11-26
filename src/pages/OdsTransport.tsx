import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Btn, Card, Kpi, PageHead } from '../components/ui'
import { useDetail } from '../components/Detail'
import { cachedSheet, freshSheet } from '../domain/sheetCache'
import { ODS_DOC_URL, ODS_ES_URL, ODS_SHEET_LINK, OdsDoc, OdsMitra, PROSES, hitungDok, parseOdsDocs, parseOdsEs, umurN4 } from '../domain/ods'

const rpF = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
const rpM = (n: number) => 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M'
const pc = (n: number, d: number) => d ? (n / d * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' : '0%'
const W = { b: '#14b8c9', o1: '#f0b73a', o2: '#f0603a', n2: '#8aa0a8', n3: '#8b7fd1' }
const SEG: [keyof typeof W, string][] = [['b', 'Siap bayar, belum overdue'], ['o1', 'Overdue < 30 hari'], ['o2', 'Overdue > 30 hari'], ['n2', 'Konfirmasi email (N2)'], ['n3', 'Verifikasi dokumen (N3)']]
type Data = { es: OdsMitra[]; docs: OdsDoc[]; at: number; stale: boolean }

export default function OdsTransport() {
  const dt = useDetail(); const [d, setD] = useState<Data | null>(null); const [err, setErr] = useState('')
  const muat = async (paksa = false) => {
    const [a, b] = await Promise.all([cachedSheet('ODS-ES'), cachedSheet('ODS-DOC')])
    if (a && !paksa) setD({ es: parseOdsEs(a.t), docs: b ? parseOdsDocs(b.t) : [], at: a.at, stale: true })
    try { const [fa, fb] = await Promise.all([freshSheet('ODS-ES', ODS_ES_URL, paksa ? 0 : 120000), freshSheet('ODS-DOC', ODS_DOC_URL, paksa ? 0 : 120000).catch(() => b ?? { t: '', at: 0 })]); setD({ es: parseOdsEs(fa.t), docs: fb.t ? parseOdsDocs(fb.t) : [], at: fa.at, stale: false }); setErr('') }
    catch (e: any) { if (!a) setErr(e?.message || String(e)); else setD(x => x && { ...x, stale: false }) }
  }
  useEffect(() => { muat() }, [])
  const v = useMemo(() => {
    if (!d) return null; const es = d.es, aktif = es.filter(x => x.t > 0).sort((a, b) => b.t - a.t), nol = es.filter(x => x.t <= 0).map(x => x.m)
    const sum = (k: keyof OdsMitra) => es.reduce((a, x) => a + (x[k] as number), 0); const C = hitungDok(d.docs)
    const T = sum('t'), B = sum('b'), O1 = sum('o1'), O2 = sum('o2'), N2 = sum('n2'), N3 = sum('n3'), N4 = sum('n4')
    const dk = Object.values(C).reduce((a, x) => ({ n2: a.n2 + x.n2, n3: a.n3 + x.n3, n4: a.n4 + x.n4, d1: a.d1 + x.d1, d2: a.d2 + x.d2 }), { n2: 0, n3: 0, n4: 0, d1: 0, d2: 0 })
    return { aktif, nol, C, T, B, O1, O2, N2, N3, N4, OV: O1 + O2, dk, belum: d.docs.filter(x => ['2', '3', '4'].includes(x.proses)) }
  }, [d])
  const bukaDok = (title: string, rows: OdsDoc[], color = '#14b8c9') => { const s = [...rows].sort((a, b) => (b.lamaOd ?? -1) - (a.lamaOd ?? -1) || b.nilai - a.nilai)
    dt.open({ variant: 'drawer', wide: true, title, sub: `${rows.length} dokumen · ${rpF(rows.reduce((a, x) => a + x.nilai, 0))}`, color,
      table: { head: ['No SI', 'Mitra', 'Kapal', 'No. invoice', 'Tgl invoice', 'Proses', 'Nilai (bruto)', 'Lama overdue', 'Keterangan'], align: ['l', 'l', 'l', 'l', 'l', 'l', 'r', 'r', 'l'], rows: s.slice(0, 150).map(x => [x.si || '—', x.mitra, x.kapal.slice(0, 40) || '—', x.invoice || '—', x.tglInv || '—', <span className={x.proses === '4' ? (umurN4(x) === 'o2' ? 'st-bad' : umurN4(x) === 'o1' ? 'st-warn' : 'st-ok') : 'st-na'}>{PROSES[x.proses] ?? x.proses}</span>, rpF(x.nilai), x.lamaOd != null && x.proses === '4' ? x.lamaOd + ' hari' : '—', x.ket || '—']) },
      note: rows.length > 150 ? `Menampilkan 150 dari ${rows.length} dokumen.` : undefined }) }
  const bukaMitra = (x: OdsMitra) => { const docs = v!.belum.filter(z => z.mitra === x.m.toUpperCase()); const c = v!.C[x.m.toUpperCase()]
    dt.open({ variant: 'drawer', wide: true, title: `Hutang ${x.m}`, sub: `${pc(x.t, v!.T)} dari total hutang · ${docs.length} dokumen belum dibayar`, color: x.o2 > 0 ? W.o2 : x.o1 > 0 ? W.o1 : W.b,
      stats: [{ l: 'Hutang keseluruhan', v: rpM(x.t) }, { l: 'Siap bayar (N4)', v: rpM(x.n4) }, { l: 'Overdue', v: rpM(x.o1 + x.o2), c: x.o1 + x.o2 ? W.o2 : undefined }, { l: 'N2 + N3', v: rpM(x.n2 + x.n3) }],
      bars: [{ title: 'Komposisi hutang (Rp)', items: SEG.map(([k, l]) => ({ l, v: x[k], c: W[k] })).filter(s => s.v > 0), fmt: (n: number) => rpM(n) }],
      table: { head: ['No SI', 'Kapal', 'No. invoice', 'Proses', 'Nilai (bruto)', 'Lama overdue', 'Keterangan'], align: ['l', 'l', 'l', 'l', 'r', 'r', 'l'], rows: docs.sort((a, b) => (b.lamaOd ?? -1) - (a.lamaOd ?? -1)).slice(0, 120).map(z => [z.si || '—', z.kapal.slice(0, 40) || '—', z.invoice || '—', PROSES[z.proses] ?? z.proses, rpF(z.nilai), z.lamaOd != null && z.proses === '4' ? z.lamaOd + ' hari' : '—', z.ket || '—']) },
      note: c ? `Dokumen: N2 ${c.n2} · N3 ${c.n3} · N4 ${c.n4} (overdue <30 hari ${c.d1}, >30 hari ${c.d2}).` : undefined }) }
  const mitraPopup = (title: string, k: keyof OdsMitra, color: string) => { const rows = v!.aktif.filter(x => (x[k] as number) > 0).sort((a, b) => (b[k] as number) - (a[k] as number))
    dt.open({ variant: 'drawer', title, sub: `${rows.length} mitra · ${rpF(rows.reduce((a, x) => a + (x[k] as number), 0))}`, color, bars: [{ title: 'Per mitra (Rp)', items: rows.map(x => ({ l: x.m, v: x[k] as number, c: color })), fmt: (n: number) => rpM(n) }] }) }
  return <div className="space-y-4">
    <PageHead icon={Wallet} color="#14b8c9" title="ODS Transport" sub={<>Outstanding hutang tagihan ke mitra transportasi 2026 · sumber: sheet Executive Summary 2026 &amp; Hutang Transport 2026 · hanya mitra yang masih punya hutang yang ditampilkan</>}
      right={<div className="flex items-center gap-2 flex-wrap">{d && <span className="text-[11px] text-slate-400">{d.stale ? 'Memperbarui… ' : ''}Data {new Date(d.at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}<Btn onClick={() => muat(true)} disabled={d?.stale}>Muat ulang</Btn><a className="pbtn" href={ODS_SHEET_LINK} target="_blank" rel="noreferrer">Buka sheet ↗</a></div>} />
    {err && <Card><p className="text-xs text-amber-300">Gagal memuat sheet: {err}</p></Card>}{!d && !err && <Card><p className="text-xs text-slate-400">Memuat data hutang dari Google Sheet…</p></Card>}
    {v && <>
      <section className="ods-hero"><div className="ods-hero-l">Total hutang keseluruhan</div><div className="ods-hero-v num">{rpF(v.T)}</div><div className="ods-hero-s">≈ {rpM(v.T)} · <b>{v.aktif.length}</b> mitra masih punya hutang{v.nol.length ? ` · ${v.nol.length} mitra lunas` : ''}</div>
        <div className="ods-stack">{SEG.map(([k]) => { const val = k === 'b' ? v.B : k === 'o1' ? v.O1 : k === 'o2' ? v.O2 : k === 'n2' ? v.N2 : v.N3; return val > 0 ? <i key={k} style={{ flex: val, background: W[k] }} title={`${SEG.find(s => s[0] === k)![1]}: ${rpM(val)}`} /> : null })}</div>
        <div className="ods-leg">{SEG.map(([k, l]) => <span key={k}><i style={{ background: W[k] }} />{l}</span>)}</div></section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Kpi label="Dokumen belum dibayar" value={v.dk.n2 + v.dk.n3 + v.dk.n4 ? (v.dk.n2 + v.dk.n3 + v.dk.n4).toLocaleString('id-ID') : '—'} note={`N2 ${v.dk.n2} · N3 ${v.dk.n3} · N4 ${v.dk.n4}`} accent="#14b8c9" onClick={() => bukaDok('Dokumen tagihan belum dibayar', v.belum)} />
        <Kpi label="Total overdue" value={rpM(v.OV)} note={`${pc(v.OV, v.T)} dari total hutang`} accent={W.o2} onClick={() => bukaDok('Dokumen overdue', v.belum.filter(x => x.proses === '4' && umurN4(x) !== 'belum'), W.o2)} />
        <Kpi label="Overdue > 30 hari" value={rpM(v.O2)} note={`${pc(v.O2, v.OV)} dari overdue · ${v.dk.d2} dokumen`} accent={W.o2} onClick={() => bukaDok('Overdue > 30 hari', v.belum.filter(x => x.proses === '4' && umurN4(x) === 'o2'), W.o2)} />
        <Kpi label="Overdue < 30 hari" value={rpM(v.O1)} note={`${pc(v.O1, v.OV)} dari overdue · ${v.dk.d1} dokumen`} accent={W.o1} onClick={() => bukaDok('Overdue < 30 hari', v.belum.filter(x => x.proses === '4' && umurN4(x) === 'o1'), W.o1)} />
        <Kpi label="Siap bayar (N4)" value={rpM(v.N4)} note={`${pc(v.N4, v.T)} dari total · ${v.dk.n4} dokumen`} accent={W.b} onClick={() => bukaDok('Siap bayar (N4)', v.belum.filter(x => x.proses === '4'))} />
        <Kpi label="Belum overdue" value={rpM(v.B)} note={`${pc(v.B, v.T)} dari total hutang`} accent={W.b} onClick={() => mitraPopup('Siap bayar, belum overdue', 'b', W.b)} />
        <Kpi label="Konfirmasi email (N2)" value={rpM(v.N2)} note={`${v.dk.n2} dokumen · ${pc(v.N2, v.T)}`} accent={W.n2} onClick={() => bukaDok('Konfirmasi email (N2)', v.belum.filter(x => x.proses === '2'), W.n2)} />
        <Kpi label="Verifikasi dokumen (N3)" value={rpM(v.N3)} note={`${v.dk.n3} dokumen · ${pc(v.N3, v.T)}`} accent={W.n3} onClick={() => bukaDok('Verifikasi dokumen (N3)', v.belum.filter(x => x.proses === '3'), W.n3)} /></div>
      <Card title="Total hutang per mitra transportasi" right={<span className="text-[11px] text-slate-400">klik baris untuk rincian dokumen</span>}>
        <div className="space-y-2">{v.aktif.map((x, i) => <button key={x.m} type="button" onClick={() => bukaMitra(x)} className="ods-row"><span className="ods-rk">{i + 1}</span><span className="ods-nm">{x.m}</span>
          <span className="ods-bar"><span style={{ width: Math.max(2, x.t / v.aktif[0].t * 100) + '%' }}>{SEG.map(([k]) => x[k] > 0 ? <i key={k} style={{ flex: x[k], background: W[k] }} /> : null)}</span></span>
          <span className="ods-val num"><b>{rpM(x.t)}</b><small>{pc(x.t, v.T)} dari total</small></span>
          <span className={'ods-tag ' + (x.o2 > 0 ? 'bad' : x.o1 > 0 ? 'warn' : 'ok')}>{x.o2 > 0 ? 'Prioritas tinggi' : x.o1 > 0 ? 'Sedang' : 'Rendah'}</span></button>)}</div>
        {v.nol.length > 0 && <p className="text-[11px] text-slate-400 mt-3">Tanpa hutang (Rp 0, tidak ditampilkan): {v.nol.join(', ')}. Mitra otomatis muncul lagi bila di sheet ada hutang baru.</p>}</Card>
      <Card title="Daftar hutang prioritas">
        <div className="overflow-x-auto"><table className="tbl-si w-full text-xs min-w-[1000px]"><thead><tr><th>#</th><th>Mitra</th><th>Konfirmasi email (N2)</th><th>Verifikasi dokumen (N3)</th><th>Siap bayar (N4)</th><th>Belum overdue</th><th>Overdue &lt; 30 hari</th><th>Overdue &gt; 30 hari</th><th>Hutang keseluruhan</th></tr></thead>
          <tbody>{v.aktif.map((x, i) => <tr key={x.m} className="cursor-pointer" onClick={() => bukaMitra(x)}><td>{i + 1}</td><td className="font-semibold">{x.m}</td>{[x.n2, x.n3, x.n4, x.b].map((n, j) => <td key={j} className="text-right num whitespace-nowrap">{n ? rpF(n) : '—'}</td>)}<td className="text-right num whitespace-nowrap" style={{ color: x.o1 ? W.o1 : undefined, whiteSpace: 'nowrap' }}>{x.o1 ? rpF(x.o1) : '—'}</td><td className="text-right num whitespace-nowrap" style={{ color: x.o2 ? W.o2 : undefined, whiteSpace: 'nowrap' }}>{x.o2 ? rpF(x.o2) : '—'}</td><td className="text-right num font-bold whitespace-nowrap">{rpF(x.t)}</td></tr>)}
            <tr className="font-bold"><td /><td>TOTAL</td>{[v.N2, v.N3, v.N4, v.B, v.O1, v.O2, v.T].map((n, j) => <td key={j} className="text-right num whitespace-nowrap">{rpF(n)}</td>)}</tr></tbody></table></div>
        <p className="text-[11px] text-slate-400 mt-2">Hutang keseluruhan mengikuti rumus sheet: N2 + N3 + N4. Overdue hanya untuk N4 (siap bayar).</p></Card>
      <Card title="Rincian jumlah dokumen tagihan">
        <div className="overflow-x-auto"><table className="tbl-si w-full text-xs min-w-[800px]"><thead><tr><th>Mitra</th><th>Konfirmasi email (N2)</th><th>Verifikasi (N3)</th><th>Siap bayar (N4)</th><th>N4 belum overdue</th><th>N4 overdue &lt; 30 hari</th><th>N4 overdue &gt; 30 hari</th><th>Total dokumen</th></tr></thead>
          <tbody>{Object.entries(v.C).filter(([, c]) => c.n2 + c.n3 + c.n4 > 0).sort((a, b) => (b[1].n2 + b[1].n3 + b[1].n4) - (a[1].n2 + a[1].n3 + a[1].n4)).map(([m, c]) => <tr key={m} className="cursor-pointer" onClick={() => bukaDok(`Dokumen ${m}`, v.belum.filter(z => z.mitra === m))}><td className="font-semibold">{m}</td>{[c.n2, c.n3, c.n4, Math.max(0, c.n4 - c.d1 - c.d2), c.d1, c.d2, c.n2 + c.n3 + c.n4].map((n, j) => <td key={j} className="text-right num whitespace-nowrap">{n}</td>)}</tr>)}
            <tr className="font-bold"><td>Total</td>{[v.dk.n2, v.dk.n3, v.dk.n4, Math.max(0, v.dk.n4 - v.dk.d1 - v.dk.d2), v.dk.d1, v.dk.d2, v.dk.n2 + v.dk.n3 + v.dk.n4].map((n, j) => <td key={j} className="text-right num whitespace-nowrap">{n}</td>)}</tr></tbody></table></div>
        <p className="text-[11px] text-slate-400 mt-2">Dihitung dari baris di sheet Hutang Transport 2026 yang belum dibayar (proses 2, 3, 4). Umur dokumen N4 mengikuti teks kolom Keterangan.</p></Card>
    </>}
  </div>
}
