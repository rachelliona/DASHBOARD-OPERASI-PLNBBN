import { useMemo, useState } from 'react'
import { FileSignature } from 'lucide-react'
import { Card, Empty, Kpi, PageHead } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { useDetail } from '../components/Detail'
import { ClusterTag, Donut, GarBars, KTabs, Scatter, shortMT } from '../components/kontrakViz'
import { CLUSTERS, CLUSTER_VAR, Cluster, STATUS_LABEL } from '../domain/kontrak'
import { fmtNum, fmtPct } from '../domain/format'
import { useBanding } from './useBanding'
import { useKModal } from '../components/KontrakModal'
import { makeViews } from './kontrakViews'
import KontrakSumber from '../components/KontrakSumber'
const OUTLIER = 5e6
const sum = (a: { vol: number }[]) => a.reduce((s, r) => s + r.vol, 0)
function agg<T extends { vol: number }>(rs: T[], f: (r: T) => string) { const m = new Map<string, number>(); rs.forEach(r => m.set(f(r), (m.get(f(r)) ?? 0) + r.vol)); return [...m].sort((a, b) => b[1] - a[1]) }

export default function Kontrak() {
  const { b, sc, k } = useBanding(); const km = useKModal()
  const [q, setQ] = useState(''), [cl, setCl] = useState<Cluster | ''>(''), [st, setSt] = useState<'' | '0' | '1'>(''), [ex, setEx] = useState(false), [pl, setPl] = useState('')
  const real = useMemo(() => new Map((b?.kontrak ?? []).map(x => [x.id, x])), [b])
  const base = useMemo(() => k.rows.filter(r => !(ex && r.vol > OUTLIER) && (!cl || r.cluster === cl) && (!st || String(r.status) === st) && (!q || `${r.pelanggan} ${r.tambang} ${r.gar} ${r.cluster} ${STATUS_LABEL[r.status]}`.toLowerCase().includes(q.toLowerCase()))), [k.rows, ex, cl, st, q])
  const pool = useMemo(() => base.filter(r => !pl || r.pelanggan === pl), [base, pl])
  const filt = !!(q || cl || st || ex || pl)
  const tot = sum(pool), gar = tot ? pool.reduce((s, r) => s + r.gar * r.vol, 0) / tot : 0, open = sum(pool.filter(r => r.status === 1))
  const byCl = CLUSTERS.map(c => ({ k: c, v: sum(pool.filter(r => r.cluster === c)), c: CLUSTER_VAR[c] }))
  const garRows = useMemo(() => { const m = new Map<number, { v: number; c: Cluster }>(); pool.forEach(r => { const a = m.get(r.gar) ?? { v: 0, c: r.cluster }; a.v += r.vol; m.set(r.gar, a) }); return [...m].sort((x, y) => x[0] - y[0]).map(([gar, a]) => ({ gar, ...a })) }, [pool])
  const cust = agg(pool, r => r.pelanggan), mine = agg(pool.filter(r => !/^blending/i.test(r.tambang)), r => r.tambang.replace(/^(PT|CV)\s+/i, ''))
  const plantCards = useMemo(() => { const m = new Map<string, typeof base>(); base.forEach(r => m.set(r.pelanggan, [...(m.get(r.pelanggan) ?? []), r])); return [...m].map(([n, v]) => ({ n, v, t: sum(v) })).sort((a, b) => b.t - a.t) }, [base])
  const V = b ? makeViews(b, 'ds', sc.label) : null
  const showK = (id: string) => { const r = real.get(id); if (r && V) km.open(V.contractView(r)) }
  const poolK = (b?.kontrak ?? []).filter(c => pool.some(r => r.id === c.id))
  const kOpen = (f: () => any) => V ? () => km.open(f()) : undefined
  const rows = pool.map(r => { const x = real.get(r.id); const ds = x?.real.ds ?? 0; return { ...r, ds, pct: r.vol > 0 && b ? ds / r.vol * 100 : null, statusTxt: STATUS_LABEL[r.status] } })
  const cols: Col[] = [{ key: 'no', label: 'No' }, { key: 'pelanggan', label: 'PLTU / Pelanggan' }, { key: 'tambang', label: 'Sumber tambang' }, { key: 'gar', label: 'GAR' }, { key: 'cluster', label: 'Cluster', fmt: v => <ClusterTag c={v} /> }, { key: 'vol', label: 'Volume (MT)', fmt: v => v ? fmtNum(v) : <span className="opacity-50" title="Volume tercatat pada baris pertama kelompok kontrak">gabung</span> }, { key: 'jenis', label: 'Jenis' }, { key: 'nomor', label: 'Nomor kontrak' }, { key: 'akhir', label: 'Berakhir' },
    { key: 'ds', label: `Realisasi D/S · ${sc.label}`, tip: 'Estimasi alokasi shipment pemasok ke kontrak (lihat Kontrak vs Realisasi)', fmt: v => b ? fmtNum(v) : '…' }, { key: 'pct', label: 'Pemenuhan', fmt: v => v == null ? '—' : <span style={{ color: v > 100 ? '#fbbf24' : undefined }}>{fmtPct(v)}</span> },
    { key: 'statusTxt', label: 'Status', fmt: (v, r) => <span style={{ color: r.status ? '#fbbf24' : '#34d399' }}>● {v}</span> }]
  const outlier = k.rows.filter(r => r.vol > OUTLIER)
  return <>
    <PageHead icon={FileSignature} color="#e6b457" title="Kontrak" month={false} sub={`Portofolio kontrak pasokan batubara · ${k.rows.length} kontrak · volume dalam metrik ton (MT)`} /><KontrakSumber />
    <KTabs />
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs no-print">
      <input aria-label="Cari kontrak" placeholder="Cari pelanggan, PLTU, pemasok, GAR, cluster, status…" value={q} onChange={e => setQ(e.target.value)} className="!w-[min(100%,340px)] !py-2" />
      {(['', ...CLUSTERS] as (Cluster | '')[]).map(c => <button key={c || 'all'} className={'fchip' + (cl === c ? ' on' : '')} onClick={() => setCl(c)}>{c || 'Semua cluster'}</button>)}
      <select aria-label="Status kontrak" value={st} onChange={e => setSt(e.target.value as any)}><option value="">Semua status</option><option value="0">Terkontrak</option><option value="1">On progress kontrak baru</option></select>
      {outlier.length > 0 && <button className={'fchip' + (ex ? ' on' : '')} title={`Sembunyikan ${outlier.length} kontrak di atas ${shortMT(OUTLIER)} MT`} onClick={() => setEx(!ex)}>Sembunyikan outlier</button>}
      {filt && <button className="fchip" onClick={() => { setQ(''); setCl(''); setSt(''); setEx(false); setPl('') }}>Reset filter</button>}
      <span className="text-slate-400 ml-auto">Menampilkan {pool.length} dari {k.rows.length} kontrak{pl ? ' · ' + pl : ''}</span>
    </div>
    {!pool.length ? <Empty text="Tidak ada kontrak yang cocok" hint="Ubah kata kunci atau reset filter." /> : <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
        <Kpi label="Total volume" value={fmtNum(tot)} unit="MT" accent="#e6b457" onClick={kOpen(() => V!.contracts('Total volume kontrak', poolK, { sort: 'kontrak-desc' }))} /><Kpi label="Jumlah kontrak" value={fmtNum(pool.length)} unit="baris kontrak" accent="#38bdf8" onClick={kOpen(() => V!.contracts('Semua kontrak', poolK, { sort: 'kontrak-desc', color: '#38bdf8' }))} /><Kpi label="GAR rata-rata tertimbang" value={fmtNum(gar)} unit="kcal/kg" accent="#a78bfa" />
        <Kpi label="Pelanggan unik" value={fmtNum(new Set(pool.map(r => r.pelanggan)).size)} unit="PLTU / entitas" accent="#34d399" onClick={kOpen(() => V!.pltuList({ cs: poolK }))} /><Kpi label="Pemasok" value={fmtNum(new Set(pool.map(r => r.tambang)).size)} unit="sumber tambang" accent="#f472b6" onClick={kOpen(() => V!.pemasokList())} /><Kpi label="Dalam proses kontrak baru" value={fmtNum(open)} unit={`MT (${tot ? fmtNum(open / tot * 100, 1) : 0}%)`} accent="#fbbf24" onClick={kOpen(() => V!.contracts('Dalam proses kontrak baru', poolK.filter(c => c.status === 1), { color: '#fbbf24', sub: 'Status On Progress Kontrak Baru' }))} />
      </div>
      {km.node}
      <div className="grid lg:grid-cols-3 gap-3 mb-3">
        <Card title="Komposisi cluster kalori"><Donut items={byCl} center={shortMT(tot)} sub="MT total" active={cl || undefined} onPick={c => setCl(cl === c ? '' : c as Cluster)} /></Card>
        <Card title="Status kontrak">{([0, 1] as const).map(s => { const v = sum(pool.filter(r => r.status === s)), n = pool.filter(r => r.status === s).length, c = s ? '#fbbf24' : '#34d399'; return <button key={s} className="block w-full text-left my-3" onClick={() => setSt(st === String(s) ? '' : String(s) as any)}><div className="flex justify-between text-[13px]"><span style={{ color: c }}>● {STATUS_LABEL[s]}</span><b>{shortMT(v)} MT</b></div><div className="h-2.5 rounded-full bg-white/10 mt-1.5 overflow-hidden"><div style={{ width: `${v / (tot || 1) * 100}%`, background: c }} className="h-full rounded-full" /></div><div className="text-[11px] text-slate-400 mt-1">{n} kontrak</div></button> })}<p className="text-[11px] text-slate-400">Klik untuk memfilter. Kontrak baru yang masih proses bersumber dari KBS (Jawa-7) dan Blending BBS ITM (Jeneponto).</p></Card>
        <Card title="Volume per tingkat GAR"><GarBars rows={garRows} onPick={g => { setQ(String(g)) }} /></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mb-3">
        <Card title="Pelanggan dengan volume terbesar"><Bars rows={cust.slice(0, 8)} color="#38bdf8" onPick={n => setPl(pl === n ? '' : n)} active={pl} /></Card>
        <Card title="Pemasok / sumber tambang dengan volume terbesar"><Bars rows={mine.slice(0, 8)} color="#f472b6" onPick={n => setQ(n)} /></Card>
      </div>
      <Card title="Peta kontrak: GAR terhadap volume (skala log)"><Scatter rows={pool.map(r => ({ id: r.id, label: `${r.pelanggan} · ${r.tambang}`, gar: r.gar, vol: r.vol, c: r.cluster, open: r.status === 1 }))} onPick={showK} /><p className="text-[11px] text-slate-400 mt-1">Satu titik = satu kontrak; warna mengikuti cluster; titik transparan = masih on progress kontrak baru. Klik titik untuk detail.</p></Card>
      <div className="mt-3"><Card title="Analisis per PLTU / pelanggan"><div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))] max-h-[460px] overflow-y-auto p-0.5">{plantCards.map(({ n, v, t }) => { const by = CLUSTERS.map(c => ({ c, v: sum(v.filter(r => r.cluster === c)) })).filter(x => x.v > 0); const g = Math.round(v.reduce((s, r) => s + r.gar * r.vol, 0) / t); const top = agg(v, r => r.tambang)[0][0]
        return <button key={n} className={'kpc' + (pl === n ? ' on' : '')} onClick={() => setPl(pl === n ? '' : n)}><div className="text-[13px] font-semibold mb-1">{n}</div><div className="text-xl font-bold text-[#e6b457]">{shortMT(t)} MT</div><div className="kms">{by.map(x => <i key={x.c} style={{ flex: x.v, background: CLUSTER_VAR[x.c] }} />)}</div><div className="text-[11.5px] text-slate-400">{v.length} kontrak, GAR {g}</div><div className="text-[11.5px] text-slate-400 truncate">Pemasok utama: {top.replace(/^(PT|CV) /, '')}</div></button> })}</div><p className="text-[11px] text-slate-400 mt-2">Klik kartu untuk memfilter seluruh halaman pada satu PLTU; klik lagi untuk melepas. Bar warna = komposisi cluster.</p></Card></div>
      <div className="mt-3"><Card title="Detail kontrak — klik baris untuk rincian"><DataTable rows={rows} cols={cols} name="kontrak" onRow={r => showK(r.id)} /></Card></div>
    </>}
  </>
}
function Bars({ rows, color, onPick, active }: { rows: [string, number][]; color: string; onPick?: (n: string) => void; active?: string }) {
  const mx = rows[0]?.[1] ?? 1
  return <div>{rows.map(([n, v]) => <button key={n} type="button" onClick={() => onPick?.(n)} className="grid [grid-template-columns:minmax(90px,36%)_1fr_auto] gap-2.5 items-center w-full text-left my-1.5 text-[12.5px] bg-transparent border-0 text-inherit cursor-pointer" style={{ opacity: !active || active === n ? 1 : .5 }}><span className="truncate" title={n}>{n}</span><div className="h-2.5 rounded-md bg-white/10 overflow-hidden"><div className="h-full rounded-md" style={{ width: `${v / mx * 100}%`, background: `linear-gradient(90deg,color-mix(in srgb,${color} 55%,transparent),${color})` }} /></div><b className="tabular-nums min-w-[58px] text-right" style={{ color }}>{shortMT(v)}</b></button>)}</div>
}
