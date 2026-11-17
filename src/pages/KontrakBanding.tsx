import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { Card, Empty, Kpi, PageHead, Skeleton } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { useDetail } from '../components/Detail'
import { Bullet, ClusterTag, KTabs, Ring, SideBySide, SbsItem, shortMT } from '../components/kontrakViz'
import { CLUSTERS, CLUSTER_VAR, Metric, STATUS_LABEL } from '../domain/kontrak'
import { fmtNum, fmtPct } from '../domain/format'
import { kontrakActions } from '../kontrakStore'
import { kontrakSpec, MONTHS3, useBanding } from './useBanding'
type Sort = 'kontrak-desc' | 'kontrak-asc' | 'real-desc' | 'real-asc' | 'sisa-desc' | 'sisa-asc' | 'pct-asc' | 'pct-desc' | 'lebih-desc' | 'nama'
const SORTS: [Sort, string][] = [['kontrak-desc', 'Kontrak terbesar'], ['kontrak-asc', 'Kontrak terkecil'], ['real-desc', 'Realisasi terbanyak'], ['real-asc', 'Realisasi tersedikit'], ['sisa-desc', 'Paling banyak belum terealisasi'], ['sisa-asc', 'Paling sedikit belum terealisasi'], ['pct-asc', 'Pemenuhan terendah'], ['pct-desc', 'Pemenuhan tertinggi'], ['lebih-desc', 'Paling banyak melebihi kontrak'], ['nama', 'Nama A–Z']]
const sorter = (s: Sort) => (x: SbsItem, y: SbsItem) => { const px = x.kontrak > 0 ? x.real / x.kontrak : -1, py = y.kontrak > 0 ? y.real / y.kontrak : -1
  switch (s) { case 'kontrak-asc': return x.kontrak - y.kontrak; case 'real-desc': return y.real - x.real; case 'real-asc': return x.real - y.real; case 'sisa-desc': return (y.kontrak - y.real) - (x.kontrak - x.real); case 'sisa-asc': return (x.kontrak - x.real) - (y.kontrak - y.real)
    case 'pct-asc': return px - py; case 'pct-desc': return py - px; case 'lebih-desc': return (y.real - y.kontrak) - (x.real - x.kontrak); case 'nama': return x.name.localeCompare(y.name, 'id'); default: return y.kontrak - x.kontrak } }
const pctOf = (r: number, k: number) => k > 0 ? r / k * 100 : null
export default function KontrakBanding() {
  const [m, setM] = useState<Metric>('ds'), [ex, setEx] = useState(false), [sort, setSort] = useState<Sort>('kontrak-desc'), [dim, setDim] = useState<'pltu' | 'tambang'>('pltu'), [q, setQ] = useState(''), [all, setAll] = useState(false), [allPl, setAllPl] = useState(false)
  const { b, sc, k, ready } = useBanding(ex); const dt = useDetail(); const mk = m === 'ds' ? 'Unloading (D/S)' : 'Loading (B/L)'
  const D = useMemo(() => {
    if (!b) return null
    const pem = b.pemasok.map(p => ({ ...p, rl: p.real[m], pct: pctOf(p.real[m], p.kontrak) }))
    const g = new Map<string, { n: string; kontrak: number; real: number; cnt: number; payung: boolean }>()
    b.kontrak.forEach(c => { const a = g.get(c.pelanggan) ?? { n: c.pelanggan, kontrak: 0, real: 0, cnt: 0, payung: c.payung }; a.kontrak += c.vol; a.real += c.real[m]; a.cnt++; g.set(c.pelanggan, a) })
    const plg = [...g.values()]
    const cl = CLUSTERS.map(c => { const rs = b.kontrak.filter(x => x.cluster === c); return { c, kontrak: rs.reduce((s, x) => s + x.vol, 0), real: rs.reduce((s, x) => s + x.real[m], 0), n: rs.length } })
    const sts = ([0, 1] as const).map(s => { const rs = b.kontrak.filter(x => x.status === s); return { s, kontrak: rs.reduce((a, x) => a + x.vol, 0), real: rs.reduce((a, x) => a + x.real[m], 0), n: rs.length } })
    const tk = b.tanpaKontrak.map(x => ({ label: x.label, real: x.real[m], n: x.real.n })).filter(x => x.real > 0)
    const nol = b.kontrak.filter(x => x.real[m] <= 0).sort((x, y) => y.vol - x.vol)
    const luar = b.pemasok.reduce((a, p) => a + p.luar[m], 0), tanpaNama = b.tanpaNama[m]
    return { pem, plg, cl, sts, tk, nol, luar, tanpaNama, tkTot: tk.reduce((a, x) => a + x.real, 0) }
  }, [b, m])
  if (!ready) return <><PageHead icon={Scale} color="#e6b457" title="Kontrak vs Realisasi" month={false} /><KTabs /><Skeleton /></>
  if (!b || !D) return <Empty />
  const totK = b.total.kontrak, totR = b.total.real[m], alok = b.total.alokasi[m], pct = pctOf(alok, totK), tkAda = D.tk.length
  const mkShort = m === 'ds' ? 'D/S' : 'B/L'
  const sbsAll: SbsItem[] = dim === 'pltu'
    ? D.plg.map(g => ({ key: g.n, name: g.n, sub: `${g.cnt} kontrak${g.payung ? ' · payung (estimasi)' : ''}`, kontrak: g.kontrak, real: g.real, color: g.payung ? '#a78bfa' : '#34d399', onClick: () => dt.open({ title: g.n, sub: sc.label, color: '#34d399',
        stats: [{ l: 'Kontrak', v: fmtNum(g.kontrak) + ' MT' }, { l: mk, v: fmtNum(g.real) + ' MT' }, { l: 'Pemenuhan', v: fmtPct(pctOf(g.real, g.kontrak)) }, { l: g.kontrak - g.real >= 0 ? 'Belum terealisasi' : 'Melebihi kontrak', v: fmtNum(Math.abs(g.kontrak - g.real)) + ' MT' }],
        bars: [{ title: 'Kontrak per pemasok — volume (MT)', items: b.kontrak.filter(c => c.pelanggan === g.n).map(c => ({ l: c.tambang, v: c.vol, c: CLUSTER_VAR[c.cluster], sub: `terealisasi ${shortMT(c.real[m])}` })), fmt: (v: number) => fmtNum(v) }] }) }))
    : D.pem.map(p => ({ key: p.key, name: p.nama, sub: `${p.n} shipment${p.luar[m] > 0 ? ` · ${shortMT(p.luar[m])} di luar kontrak PLTU` : ''}`, kontrak: p.kontrak, real: p.rl, color: '#38bdf8', onClick: () => dt.open({ title: p.nama, sub: sc.label, color: '#38bdf8', stats: [{ l: 'Kontrak', v: fmtNum(p.kontrak) + ' MT' }, { l: mk, v: fmtNum(p.rl) + ' MT' }, { l: 'Pemenuhan', v: fmtPct(p.pct) }, { l: 'Shipment', v: String(p.n) }, { l: 'Di luar kontrak PLTU', v: fmtNum(p.luar[m]) + ' MT' }],
        bars: [{ title: 'Kontrak per pelanggan (MT)', items: b.kontrak.filter(c => c.tambang.toLowerCase().includes(p.nama.toLowerCase())).map(c => ({ l: c.pelanggan, v: c.vol, c: CLUSTER_VAR[c.cluster], sub: `terealisasi ${shortMT(c.real[m])}` })), fmt: (v: number) => fmtNum(v) }],
        trend: (m === 'ds' ? p.real.bln : p.real.blnBl).some(x => x > 0) ? { title: `${mk} per bulan (MT)`, labels: MONTHS3, data: m === 'ds' ? p.real.bln : p.real.blnBl, color: '#38bdf8', unit: 'MT' } : undefined }) }))
  const sbs = sbsAll.filter(i => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase())).sort(sorter(sort))
  const sbsShow = all ? sbs : sbs.slice(0, 12)
  const pemOver = D.pem.filter(p => (p.pct ?? 0) > 100)
  const ins: { t: string; d: string; c: string }[] = []
  const top = D.pem[0]; if (top) ins.push({ c: '#38bdf8', t: 'Pemasok kontrak terbesar', d: `${top.nama}: ${shortMT(top.kontrak)} MT kontrak, terealisasi ${shortMT(top.rl)} MT (${top.pct == null ? '—' : fmtPct(top.pct)}) pada ${sc.label}.` })
  if (pemOver.length) ins.push({ c: '#fbbf24', t: 'Melebihi volume kontrak', d: `${pemOver.slice(0, 4).map(p => `${p.nama} (${fmtPct(p.pct)})`).join(', ')}${pemOver.length > 4 ? ` dan ${pemOver.length - 4} lainnya` : ''}. Periksa apakah ada kontrak baru atau kontrak yang belum tercatat.` })
  if (tkAda) ins.push({ c: '#fb7185', t: 'Realisasi tanpa kontrak di daftar', d: `${tkAda} pemasok dengan ${shortMT(D.tkTot)} MT ${mk} tidak ditemukan di portofolio kontrak — terbesar ${D.tk.slice(0, 3).map(x => `${x.label} (${shortMT(x.real)})`).join(', ')}. Bila ini hanya beda penamaan, petakan di bagian bawah.` })
  if (D.nol.length) ins.push({ c: '#a78bfa', t: 'Kontrak belum ada realisasi', d: `${D.nol.length} dari ${b.kontrak.length} kontrak (${shortMT(D.nol.reduce((a, x) => a + x.vol, 0))} MT) belum tercatat realisasinya pada ${sc.label}.` })
  const lag = D.cl.filter(x => x.kontrak > 0).sort((x, y) => (pctOf(x.real, x.kontrak) ?? 0) - (pctOf(y.real, y.kontrak) ?? 0))[0]; if (lag) ins.push({ c: CLUSTER_VAR[lag.c], t: 'Cluster paling rendah', d: `${lag.c}: ${fmtPct(pctOf(lag.real, lag.kontrak))} dari ${shortMT(lag.kontrak)} MT kontrak.` })
  if (D.tanpaNama > 0) ins.push({ c: '#94a3b8', t: 'Pemasok belum terisi di sheet', d: `${shortMT(D.tanpaNama)} MT realisasi (${fmtPct(pctOf(D.tanpaNama, totR))} dari total) tidak punya nama sumber maupun kode mitra, jadi belum bisa dicocokkan ke kontrak.` })
  const rows = b.kontrak.map(c => ({ ...c, rl: c.real[m], pct: pctOf(c.real[m], c.vol), sisa: c.vol - c.real[m], statusTxt: STATUS_LABEL[c.status] }))
  const cols: Col[] = [{ key: 'no', label: 'No' }, { key: 'pelanggan', label: 'PLTU / Pelanggan' }, { key: 'tambang', label: 'Pemasok' }, { key: 'cluster', label: 'Cluster', fmt: v => <ClusterTag c={v} /> }, { key: 'vol', label: 'Kontrak (MT)', fmt: v => fmtNum(v) }, { key: 'rl', label: `Realisasi (MT)`, fmt: v => fmtNum(v) },
    { key: 'pct', label: 'Pemenuhan', fmt: v => v == null ? '—' : <div className="flex items-center gap-2 min-w-[130px]"><div className="h-2 flex-1 rounded bg-white/10 overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.min(100, v)}%`, background: v > 100 ? '#fbbf24' : '#34d399' }} /></div><span className="tabular-nums w-12 text-right">{fmtPct(v)}</span></div> },
    { key: 'sisa', label: 'Sisa kontrak (MT)', fmt: v => <span style={{ color: v < 0 ? '#fbbf24' : undefined }}>{fmtNum(v)}</span> }, { key: 'statusTxt', label: 'Status', fmt: (v, r) => <span style={{ color: r.status ? '#fbbf24' : '#34d399' }}>● {v}</span> }]
  const bln = m === 'ds' ? b.total.real.bln : b.total.real.blnBl
  const mx = Math.max(...bln, 1)
  const alias = Object.entries(k.alias)
  return <>
    <PageHead icon={Scale} color="#e6b457" title="Kontrak vs Realisasi" month={false} sub={`Volume kontrak dibandingkan realisasi pasokan (${mk}) · ${sc.label}`} />
    <KTabs />
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print">{sc.ui}
      <div className="vsw" role="tablist" aria-label="Ukuran realisasi">{([['ds', 'Bongkar (D/S)'], ['bl', 'Muat (B/L)']] as [Metric, string][]).map(([v, l]) => <button key={v} role="tab" aria-selected={m === v} onClick={() => setM(v)} className={'vsw-b' + (m === v ? ' on' : '')}><span>{l}</span></button>)}</div>
      <button className={'fchip' + (ex ? ' on' : '')} onClick={() => setEx(!ex)} title="Sembunyikan kontrak di atas 5 jt MT (kontrak multi-tahun)">Sembunyikan outlier</button></div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
      <Kpi label="Volume kontrak" value={fmtNum(totK)} unit="MT" accent="#38bdf8" /><Kpi label={`Realisasi ${m === 'ds' ? 'D/S' : 'B/L'}`} value={fmtNum(totR)} unit={`MT · ${fmtNum(b.total.real.n)} shipment`} accent="#34d399" />
      <Kpi label="Terhadap kontrak" value={pct == null ? '—' : fmtNum(pct, 1)} unit="% (yang bisa dicocokkan)" accent="#e6b457" /><Kpi label="Sisa kontrak" value={fmtNum(Math.max(0, totK - alok))} unit="MT" accent="#a78bfa" />
      <Kpi label="Tanpa kontrak" value={fmtNum(D.tkTot)} unit={`MT · ${tkAda} pemasok`} accent="#fb7185" /><Kpi label="Kontrak tanpa realisasi" value={fmtNum(D.nol.length)} unit={`dari ${b.kontrak.length} kontrak`} accent="#94a3b8" />
    </div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">{ins.map(i => <div key={i.t} className="kins" style={{ ['--ic' as any]: i.c }}><b>{i.t}</b>{i.d}</div>)}</div>
    <Card title="Kontrak vs realisasi berdampingan" right={<div className="flex flex-wrap gap-2 items-center text-xs no-print">
      <div className="vsw" role="group" aria-label="Kelompok"><button type="button" className={'vsw-b' + (dim === 'pltu' ? ' on' : '')} onClick={() => { setDim('pltu'); setAll(false) }}>Per PLTU</button><button type="button" className={'vsw-b' + (dim === 'tambang' ? ' on' : '')} onClick={() => { setDim('tambang'); setAll(false) }}>Per sumber tambang</button></div>
      <input type="search" aria-label="Cari" placeholder={dim === 'pltu' ? 'Cari PLTU…' : 'Cari tambang…'} value={q} onChange={e => setQ(e.target.value)} className="!w-[140px]" />
      <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value as Sort)}>{SORTS.map(([v, l]) => <option key={v} value={v}>Urut: {l}</option>)}</select></div>}>
      {sbs.length === 0 ? <p className="text-xs text-slate-400">Tidak ada data yang cocok.</p> : <SideBySide items={sbsShow} mk={mkShort} />}
      {sbs.length > 12 && <button className="fchip mt-2" onClick={() => setAll(!all)}>{all ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${sbs.length}`}</button>}
      {dim === 'pltu' && <p className="text-[11px] text-slate-400 mt-2">Kontrak payung (PLN/PNP, PIP, dll.) berlaku lintas PLTU: realisasinya adalah sisa shipment pemasok yang tidak tertampung kontrak khusus PLTU, jadi berupa estimasi alokasi. Klik baris untuk rincian.</p>}
    </Card>
    <div className="grid lg:grid-cols-2 gap-3 mt-3">
      <div>
        <Card title="Per cluster kalori"><div className="grid grid-cols-3 gap-2">{D.cl.map(c => { const p = pctOf(c.real, c.kontrak); return <div key={c.c} className="text-center"><div className="flex justify-center"><Ring pct={p} color={CLUSTER_VAR[c.c]} /></div><div className="mt-1.5"><ClusterTag c={c.c} /></div><div className="text-[11px] text-slate-400 mt-1 leading-snug">{shortMT(c.real)} dari {shortMT(c.kontrak)} MT<br />{c.n} kontrak</div></div> })}</div></Card>
      </div><div>
        <Card title="Per status kontrak">{D.sts.map(s => <Bullet key={s.s} name={STATUS_LABEL[s.s]} sub={`${s.n} kontrak`} kontrak={s.kontrak} real={s.real} color={s.s ? '#fbbf24' : '#34d399'} />)}</Card>
      </div>
    </div>
    <div className="mt-3"><Card title={`Realisasi ${mk} per bulan`}><div className="flex items-end gap-1.5 h-36" role="img" aria-label="Realisasi per bulan">{bln.map((v, i) => <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1"><span className="text-[10px] tabular-nums text-slate-400">{v > 0 ? shortMT(v) : ''}</span><div className="w-full rounded-t-md" style={{ height: `${v / mx * 100}%`, minHeight: v > 0 ? 3 : 0, background: 'linear-gradient(180deg,#e6b457,#d99a2b)' }} /><span className="text-[10px] text-slate-400">{MONTHS3[i]}</span></div>)}</div>
      <p className="text-[11px] text-slate-400 mt-2">Bulan menurut tanggal milestone terakhir shipment (2026). Total seluruh shipment pada cakupan ini; sebagian belum bisa dicocokkan ke kontrak.</p></Card></div>
    <div className="grid lg:grid-cols-2 gap-3 mt-3">
      <Card title={`Realisasi tanpa kontrak (${D.tk.length})`}>{D.tk.length === 0 ? <p className="text-xs text-slate-400">Semua realisasi yang bernama pemasok sudah ada di portofolio kontrak.</p> : <ul className="space-y-1.5">{D.tk.slice(0, 14).map(x => <li key={x.label} className="flex items-center gap-2 text-[12.5px]"><span className="truncate flex-1" title={x.label}>{x.label}</span><b className="tabular-nums" style={{ color: '#fb7185' }}>{shortMT(x.real)}</b>
        <select aria-label={`Petakan ${x.label}`} className="!max-w-[150px]" value={k.alias[x.label] ?? ''} onChange={e => kontrakActions.setAlias(x.label, e.target.value)}><option value="">Petakan ke…</option>{b.pemasok.map(p => <option key={p.key} value={p.nama}>{p.nama}</option>)}<option value="-">Abaikan (bukan pemasok)</option></select></li>)}</ul>}
        {alias.length > 0 && <p className="text-[11px] text-slate-400 mt-2">{alias.length} pemetaan manual tersimpan di browser ini. <button className="underline" onClick={() => alias.forEach(([l]) => kontrakActions.setAlias(l, ''))}>Hapus semua</button></p>}</Card>
      <Card title={`Kontrak belum ada realisasi (${D.nol.length})`}>{D.nol.length === 0 ? <p className="text-xs text-slate-400">Semua kontrak sudah memiliki realisasi.</p> : <ul className="space-y-1.5 max-h-[340px] overflow-y-auto">{D.nol.slice(0, 40).map(c => <li key={c.id}><button className="flex items-center gap-2 w-full text-left text-[12.5px] bg-transparent border-0 text-inherit cursor-pointer" onClick={() => dt.open(kontrakSpec(c, b, m, sc.label))}><ClusterTag c={c.cluster} /><span className="truncate flex-1">{c.pelanggan} · {c.tambang.replace(/^(PT|CV) /, '')}</span><b className="tabular-nums">{shortMT(c.vol)}</b></button></li>)}</ul>}
        <p className="text-[11px] text-slate-400 mt-2">Bisa berarti belum berjalan di periode ini, atau nama pemasok di sheet berbeda dari kontrak.</p></Card>
    </div>
    <div className="mt-3"><Card title="Detail kontrak vs realisasi — klik baris untuk rincian"><DataTable rows={rows} cols={cols} name="kontrak-vs-realisasi" onRow={r => dt.open(kontrakSpec(r, b, m, sc.label))} /></Card></div>
    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">Cara membaca: volume kontrak adalah total kontrak (masa berlaku tidak tercatat di daftar), sedangkan realisasi hanya shipment pada cakupan bulan terpilih, sehingga kontrak multi-tahun wajar terlihat rendah. Shipment dicocokkan ke pemasok lewat kode Mitra Real. dan nama sumber tambang, lalu dibagi ke kontrak khusus PLTU tujuan lebih dulu, baru kontrak payung. {sc.label.startsWith('Tahun') ? '' : ''}Angka per kontrak adalah estimasi alokasi.</p>
  </>
}
