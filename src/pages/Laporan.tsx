import { useEffect, useMemo, useState } from 'react'
import { FileBarChart } from 'lucide-react'
import { TIP } from '../components/chartTheme'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { useStore } from '../store'
import { Bar, Btn, Card, Empty, Kpi, PageHead, RegionChip } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, REGIONS, norm } from '../domain/status'
import { BULAN, aggregatePlants, toShipRows } from '../domain/monthly'
import { pct, plantActual, kebutuhan, sum } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { compactSumber, fmtUpdate, sumberText, tone } from '../domain/view'
import { REGION_COLOR } from '../config/regions'
import LaporanSlide from './LaporanSlide'
import { useDetail } from '../components/Detail'
import { Copy, Check, Maximize2 } from 'lucide-react'
const SEG = [...STAGES, { key: 'terjadwal', label: 'Sudah Ada Jadwal Muat', color: '#94a3b8' }, { key: 'lain', label: 'Belum ada status', color: '#64748b' }]
const ACTIVE = ['loading', 'sailing', 'tiba', 'bongkar']; const ROW = 30; const M = { top: 5, right: 64, left: 0, bottom: 5 }
const SORTS: Record<string, (a: any, b: any) => number> = { urut: () => 0, rendah: (a, b) => (a.p ?? -1) - (b.p ?? -1), tinggi: (a, b) => (b.p ?? -1) - (a.p ?? -1), besar: (a, b) => b.keb - a.keb }
export default function Laporan() {
  const { kinds, months, bulanAktif, asOf, raw, status, fetchSheet } = useStore(); const [bln, setBln] = useState(''); const b = bln || bulanAktif
  useEffect(() => { if (!asOf && b !== bulanAktif && BULAN.includes(b) && !raw[b] && !status[b]) fetchSheet(b) }, [b, asOf])
  const dt = useDetail(); const [copied, setCopied] = useState(false)
  const mm = months[b]; const alt = b !== bulanAktif && mm && !mm.missing.length
  const ds = useMemo(() => alt ? { rows: aggregatePlants(mm.ships), source: `Sheet ${b}`, at: mm.at } as any : kinds.plant, [alt, mm, kinds.plant]); const sh = useMemo(() => alt ? toShipRows(mm.ships) as any[] : kinds.shipment?.rows ?? [], [alt, mm, kinds.shipment])
  const [basis, setBasis] = useState<'bl' | 'ds'>('bl'); const [view, setView] = useState<'slide' | 'interaktif'>('slide'); const [reg, setReg] = useState(REGIONS[0]); const [q, setQ] = useState(''); const [stage, setStage] = useState(''); const [mode, setMode] = useState<'grafik' | 'tabel'>('grafik'); const [sort, setSort] = useState('urut')
  const bulanBar = <div className="chips flex flex-wrap gap-1.5 mb-3 no-print"><span className="text-[11px] text-slate-400 self-center">Bulan:</span>{BULAN.map(x => { const ok = !!months[x] && !months[x].missing.length; return <button key={x} disabled={!ok && x !== bulanAktif && !!asOf} onClick={() => setBln(x === bulanAktif ? '' : x)} className={'fchip' + (b === x ? ' on' : '')} style={{ ['--c' as any]: ok || x === bulanAktif ? '#34d399' : '#64748b' }}>{x}</button> })}</div>
  if (!ds) return <Empty />
  if (b !== bulanAktif && !alt) return <>{bulanBar}<Card><p className="text-xs">{asOf ? 'Data Belum Tersedia pada tanggal ini.' : status[b]?.state === 'Gagal Diakses' ? 'Gagal Mengambil Data' : 'Memuat Data…'}</p></Card></>
  const salin = async () => { const L = [`*UPDATE MONITORING PASOKAN PLTU — ${b.toUpperCase()} 2026*`, `Update ${fmtUpdate(ds.at)} · Satuan MT`, '']
    for (const g of REGIONS) { const r = ds.rows.filter((x: any) => x.wilayah === g); if (!r.length) continue; const t = sum(r, 'target'), c = sum(r, 'carryOver'), v = sum(r, basis); L.push(`*${g}* — Konfirmasi ${fmtNum(t)} | CO ${fmtNum(c)} | ${basis === 'bl' ? 'Loading' : 'Unloading'} ${fmtNum(v)} (${fmtPct(pct(v, t + c))})`) }
    const low = [...ds.rows].filter((x: any) => x.wilayah && kebutuhan(x) > 0).map((x: any) => ({ n: x.pltu, p: pct(x[basis] ?? 0, kebutuhan(x)) })).sort((a, z) => (a.p ?? 0) - (z.p ?? 0)).slice(0, 3); if (low.length) L.push('', '*Perlu perhatian (pemenuhan terendah):*', ...low.map(x => `• ${x.n}: ${fmtPct(x.p)}`))
    try { await navigator.clipboard.writeText(L.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2200) } catch { dt.open({ title: 'Salin manual', body: <pre className="text-xs whitespace-pre-wrap select-all">{L.join('\n')}</pre> } as any) } }
  const viewBar = <div className="flex flex-wrap gap-1.5 mb-3 no-print items-center">{([['slide', 'Laporan (Slide)'], ['interaktif', 'Tampilan Interaktif']] as const).map(([k, l]) => <button key={k} onClick={() => setView(k)} className={'fchip' + (view === k ? ' on' : '')} style={{ ['--c' as any]: '#e6b457' }}>{l}</button>)}
    <span className="flex-1" /><button className="pbtn" data-tip="Salin ringkasan per wilayah + 3 PLTU terendah, siap tempel ke WhatsApp" onClick={salin}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Tersalin' : 'Salin ringkasan WhatsApp'}</button>
    <button className="pbtn" data-tip="Layar penuh untuk rapat (Esc untuk keluar)" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}><Maximize2 size={14} />Layar penuh</button></div>
  if (view === 'slide') return <>{bulanBar}{viewBar}<LaporanSlide b={b} ds={ds} sh={sh} months={months} /></>
  const inStage = (x: any) => stage === 'carryOver' ? x.konf === 'carry' : stage ? x.status === stage : ACTIVE.includes(x.status)
  const regionRows = ds.rows.filter(r => r.wilayah === reg); const col = REGION_COLOR[reg]
  const rows = regionRows.filter(r => (!q || norm(r.pltu).includes(norm(q))) && (!stage || (r[stage] ?? 0) > 0)).map(r => ({ ...r, keb: kebutuhan(r), p: pct(r[basis] ?? 0, kebutuhan(r)), sumberTxt: sumberText(sh.filter(x => x.pltu === r.pltu && inStage(x))), z: 0 }) as Record<string, any>).map(r => ({ ...r, tot: (stage ? [stage] : SEG.map(g => g.key)).reduce((a, k) => a + (r[k] ?? 0), 0) })).sort(SORTS[sort])
  const T = { t: sum(regionRows, 'target'), c: sum(regionRows, 'carryOver'), bl: sum(regionRows, 'bl'), ds: sum(regionRows, 'ds') }; const P = pct(T[basis], T.t + T.c)
  const maxTot = Math.max(1, ...rows.map(r => r.tot)); const keys = stage ? [stage] : SEG.map(s => s.key); const H = rows.length * ROW + 40
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: v => fmtNum(v) }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: v => fmtNum(v) },
    { key: 'p', label: 'Pemenuhan', fmt: v => <div className="w-28"><div className="text-[11px]" style={{ color: tone(v) }}>{fmtPct(v)}</div><Bar pct={v} color={tone(v)} /></div> },
    ...SEG.filter(s => keys.includes(s.key) && s.key !== 'carryOver').map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })), { key: 'sumberTxt', label: 'Sumber Tambang' }]
  return <>
    <PageHead icon={FileBarChart} color="#e6b457" title={`UPDATE MONITORING PASOKAN PLTU — ${b.toUpperCase()} 2026`} sub={`PT PLN BATUBARA NIAGA · UPDATE ${fmtUpdate(ds.at)} · Satuan: MT · Sumber: ${ds.source}`} />
    {bulanBar}{viewBar}
    <div className="chips flex flex-wrap gap-1.5 mb-2 no-print">{REGIONS.map(g => <RegionChip key={g} label={g} color={REGION_COLOR[g]} on={reg === g} onClick={() => setReg(g)} />)}</div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
      <Kpi label="Konfirmasi" value={fmtNum(T.t)} unit="MT" accent={col} /><Kpi label="Carry Over" value={fmtNum(T.c)} unit="MT" accent="#ef4444" /><Kpi label="Complete Loading (B/L)" value={fmtNum(T.bl)} unit="MT" accent="#38bdf8" />
      <Kpi label="Complete Unloading (D/S)" value={fmtNum(T.ds)} unit="MT" accent="#22c55e" /><div className="kpi" style={{ ['--ac' as any]: tone(P) }}><div className="text-[10.5px] uppercase tracking-wider text-slate-400">Pemenuhan {reg} · {basis === 'bl' ? 'Loading' : 'Unloading'}</div><div className="text-[22px] font-bold num mt-1 mb-2" style={{ color: tone(P) }}>{fmtPct(P)}</div><Bar pct={P} color={tone(P)} /></div></div>
    <div className="chips flex flex-wrap items-center gap-2 mb-2 text-xs no-print">
      {[['terjadwal', 'terjadwal'], ['loading', 'loading'], ['sailing', 'sailing'], ['tiba', 'sandar'], ['bongkar', 'bongkar']].map(([k, l]) => <span key={k} className="fchip" style={{ ['--c' as any]: '#94a3b8' }}>{l} <b>{sh.filter(x => x.wilayah === reg && x.status === k).length}</b></span>)}
      </div><div className="flex flex-wrap items-center gap-2 mb-2 text-xs no-print"><input aria-label="Cari PLTU" placeholder="Cari PLTU…" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value)}><option value="urut">Urutan laporan</option><option value="rendah">Pemenuhan terendah</option><option value="tinggi">Pemenuhan tertinggi</option><option value="besar">Kebutuhan terbesar</option></select>
      <span className="inline-flex items-center gap-1" role="group" aria-label="Dasar persentase"><span className="text-[11px] text-slate-400">Dasar %:</span><button className={'fchip' + (basis === 'bl' ? ' on' : '')} style={{ ['--c' as any]: '#38bdf8' }} onClick={() => setBasis('bl')}>Loading</button><button className={'fchip' + (basis === 'ds' ? ' on' : '')} style={{ ['--c' as any]: '#22c55e' }} onClick={() => setBasis('ds')}>Unloading</button></span><Btn onClick={() => setMode(mode === 'grafik' ? 'tabel' : 'grafik')}>Tampilan {mode === 'grafik' ? 'Tabel' : 'Grafik'}</Btn><Btn onClick={() => window.print()}>Ekspor ke PDF</Btn></div>
    <div className="chips flex flex-wrap gap-1.5 mb-2 no-print"><span className="text-[11px] text-slate-400 self-center">Tahapan:</span>
      {[{ key: '', label: 'Semua', color: '#9aa3b2' }, ...SEG.filter(s => s.key !== 'lain')].map(s => <button key={s.key} onClick={() => setStage(stage === s.key ? '' : s.key)} className={'fchip' + (stage === s.key ? ' on' : '')} style={{ ['--c' as any]: s.color }}>{s.label}</button>)}</div>
    {rows.length === 0 ? <Card><p className="text-xs">Data Belum Tersedia untuk filter ini.</p></Card> : mode === 'grafik'
      ? <Card title={stage ? `Volume ${STAGES.find(s => s.key === stage)?.label} — ${reg}` : `Pemenuhan Pasokan — ${reg}`}>
        <div className="flex gap-3 overflow-x-auto"><div style={{ width: 150, flexShrink: 0 }}><div className="text-[11px] text-slate-400 mb-1">Persentase pemenuhan</div>
          <ResponsiveContainer width="100%" height={H}><BarChart layout="vertical" data={rows} margin={M}><XAxis type="number" domain={[0, 100]} ticks={[0, 50, 100]} stroke="#9aa3b2" fontSize={10} tickFormatter={v => v + '%'} /><YAxis type="category" dataKey="pltu" hide />
            <Tooltip formatter={(v: any, _n: any, x: any) => [fmtPct(x.payload.p), 'Pemenuhan']} labelFormatter={(_l: any, x: any) => x?.[0]?.payload?.pltu} {...TIP} />
            <RBar cursor="pointer" onClick={(d: any) => { const r = d.payload ?? d; dt.open({ title: r.pltu, sub: `${reg} · ${b} 2026`, color: col, stats: [{ l: 'Konfirmasi', v: fmtNum(r.target) + ' MT' }, { l: 'Carry Over', v: fmtNum(r.carryOver) + ' MT' }, { l: basis === 'bl' ? 'Loading' : 'Unloading', v: fmtNum(r[basis] ?? 0) + ' MT' }, { l: 'Pemenuhan', v: fmtPct(r.p) }], table: { head: ['Tahapan', 'Volume (MT)'], rows: SEG.filter(x => (r[x.key] ?? 0) > 0).map(x => [x.label, fmtNum(r[x.key])]), align: ['l', 'r'] }, note: r.sumberTxt ? 'Sumber tambang: ' + r.sumberTxt : undefined, actions: [{ label: 'Buka halaman PLTU', to: '/pltu/' + encodeURIComponent(r.pltu) }] }) }} dataKey={(r: any) => Math.min(100, r.p ?? 0)} background={{ fill: 'rgba(128,140,160,.16)' }} barSize={14} radius={[0, 8, 8, 0]}>{rows.map((r, i) => <Cell key={i} fill={tone(r.p)} />)}<LabelList dataKey="p" position="right" formatter={(v: any) => v == null ? '—' : fmtNum(v, 0) + '%'} fill="#e8e6e1" fontSize={10} /></RBar></BarChart></ResponsiveContainer></div>
          <div className="flex-1" style={{ minWidth: 420 }}><div className="text-[11px] text-slate-400 mb-1">Volume per tahapan (MT){stage ? ' — hanya tahapan terpilih' : ''}</div>
            <ResponsiveContainer width="100%" height={H}><BarChart layout="vertical" data={rows} margin={M}><XAxis type="number" stroke="#9aa3b2" fontSize={10} tickFormatter={v => fmtNum(v / 1000) + 'rb'} /><YAxis type="category" dataKey="pltu" width={160} stroke="#9aa3b2" fontSize={11} interval={0} />
              <Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} {...TIP} />
              {SEG.filter(s => keys.includes(s.key)).map(s => <RBar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} barSize={16}><LabelList dataKey={s.key} position="center" formatter={(v: any) => v > maxTot * 0.1 ? fmtNum(v) : ''} fill="#fff" fontSize={10} fontWeight={600} /></RBar>)}<RBar dataKey="z" name="Total" stackId="a" fill="transparent" legendType="none" isAnimationActive={false}><LabelList dataKey="tot" position="right" formatter={(v: any) => v ? fmtNum(v) : '—'} fill="#e8ecf4" fontSize={11} fontWeight={700} /></RBar></BarChart></ResponsiveContainer></div>
          <div style={{ width: 300, flexShrink: 0 }}><div className="text-[11px] text-slate-400 mb-1">Sumber Tambang{stage ? '' : ' (aktif)'}</div><div style={{ paddingTop: 5 }}>{rows.map(r => <div key={r.pltu} style={{ height: ROW, display: 'flex', alignItems: 'center' }} title={r.sumberTxt}><span className="sumber-cell">{r.sumberTxt ? compactSumber(r.sumberTxt, 2) : <span className="text-slate-600">—</span>}</span></div>)}</div></div></div>
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">{SEG.filter(s => keys.includes(s.key)).map(s => <span key={s.key}><span style={{ color: s.color }}>■</span> {s.label}</span>)}</div></Card>
      : <Card title={`Rincian ${reg}`}><DataTable rows={rows} cols={cols} name={`laporan-harian-${norm(reg)}`} /></Card>}
    <p className="text-[11px] text-slate-500">Pemenuhan = Σ {basis === 'bl' ? 'Complete Loading (B/L)' : 'Complete Unloading (D/S)'} ÷ (Konfirmasi + Carry Over), sama dengan angka % di sheet DASHBOARD (Loading) dan slide 2. Carry Over = Σ Jumlah berkonfirmasi Carry Over. {ds.rows.filter(r => !r.wilayah && r.n > 0).length > 0 && `${ds.rows.filter(r => !r.wilayah && r.n > 0).length} PLTU bershipment belum masuk wilayah mana pun (${ds.rows.filter(r => !r.wilayah && r.n > 0).map(r => r.pltu).join(', ')}).`}</p>
  </>
}
