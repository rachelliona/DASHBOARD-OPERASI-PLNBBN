import { useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { useStore } from '../store'
import { Bar, Btn, Card, Empty, Kpi } from '../components/ui'
import { DataTable, Col } from '../components/DataTable'
import { STAGES, REGIONS, norm } from '../domain/status'
import { pct, plantActual, kebutuhan, sum } from '../domain/kpi'
import { fmtNum, fmtPct } from '../domain/format'
import { fmtUpdate, sumberText, tone } from '../domain/view'
import { REGION_COLOR } from '../config/regions'
const ACTIVE = ['loading', 'sailing', 'tiba', 'bongkar']; const ROW = 30; const M = { top: 5, right: 40, left: 0, bottom: 5 }
const SORTS: Record<string, (a: any, b: any) => number> = { urut: () => 0, rendah: (a, b) => (a.p ?? -1) - (b.p ?? -1), tinggi: (a, b) => (b.p ?? -1) - (a.p ?? -1), besar: (a, b) => b.keb - a.keb }
export default function Laporan() {
  const { kinds } = useStore(); const ds = kinds.plant; const sh = kinds.shipment?.rows ?? []
  const [reg, setReg] = useState(REGIONS[0]); const [q, setQ] = useState(''); const [stage, setStage] = useState(''); const [mode, setMode] = useState<'grafik' | 'tabel'>('grafik'); const [sort, setSort] = useState('urut')
  if (!ds) return <Empty />
  const inStage = (x: any) => stage === 'carryOver' ? x.konf === 'carry' : stage ? x.status === stage : ACTIVE.includes(x.status)
  const regionRows = ds.rows.filter(r => r.wilayah === reg); const col = REGION_COLOR[reg]
  const rows = regionRows.filter(r => (!q || norm(r.pltu).includes(norm(q))) && (!stage || (r[stage] ?? 0) > 0)).map(r => ({ ...r, keb: kebutuhan(r), p: pct(plantActual(r), kebutuhan(r)), sumberTxt: sumberText(sh.filter(x => x.pltu === r.pltu && inStage(x))) }) as Record<string, any>).sort(SORTS[sort])
  const T = { t: sum(regionRows, 'target'), c: sum(regionRows, 'carryOver'), bl: sum(regionRows, 'bl'), ds: sum(regionRows, 'ds') }; const P = pct(T.ds, T.t + T.c)
  const keys = stage ? [stage] : STAGES.map(s => s.key); const H = rows.length * ROW + 40
  const cols: Col[] = [{ key: 'pltu', label: 'PLTU' }, { key: 'target', label: 'Konfirmasi (MT)', fmt: v => fmtNum(v) }, { key: 'carryOver', label: 'Carry Over (MT)', fmt: v => fmtNum(v) },
    { key: 'p', label: 'Pemenuhan', fmt: v => <div className="w-28"><div className="text-[11px]" style={{ color: tone(v) }}>{fmtPct(v)}</div><Bar pct={v} color={tone(v)} /></div> },
    ...STAGES.filter(s => keys.includes(s.key) && s.key !== 'carryOver').map(s => ({ key: s.key, label: `${s.label} (MT)`, fmt: (v: any) => fmtNum(v) })), { key: 'sumberTxt', label: 'Sumber Tambang' }]
  return <>
    <div className="mb-3"><h2 className="text-sm font-bold tracking-wide">UPDATE MONITORING PASOKAN PLTU — PT PLN BATUBARA NIAGA</h2>
      <p className="text-xs" style={{ color: '#e6b457' }}>UPDATE {fmtUpdate(ds.at)} · Satuan: MT · Sumber: {ds.source}</p></div>
    <div className="flex flex-wrap gap-1.5 mb-2 no-print">{REGIONS.map(g => <button key={g} onClick={() => setReg(g)} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: REGION_COLOR[g], background: reg === g ? REGION_COLOR[g] : 'transparent', color: reg === g ? '#15130d' : REGION_COLOR[g], fontWeight: reg === g ? 600 : 400 }}>{g}</button>)}</div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
      <Kpi label="Konfirmasi" value={fmtNum(T.t)} unit="MT" accent={col} /><Kpi label="Carry Over" value={fmtNum(T.c)} unit="MT" accent="#fb7185" /><Kpi label="Complete Loading (B/L)" value={fmtNum(T.bl)} unit="MT" accent="#38bdf8" />
      <Kpi label="Complete Unloading (D/S)" value={fmtNum(T.ds)} unit="MT" accent="#34d399" /><div className="rounded-xl border border-white/10 bg-[#171a21] p-3" style={{ borderTop: `2px solid ${tone(P)}` }}><div className="text-[11px] text-slate-400">Pemenuhan {reg}</div><div className="text-lg font-bold num" style={{ color: tone(P) }}>{fmtPct(P)}</div><Bar pct={P} color={tone(P)} /></div></div>
    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs no-print">
      {[['terjadwal', 'terjadwal'], ['loading', 'loading'], ['sailing', 'sailing'], ['tiba', 'sandar'], ['bongkar', 'bongkar']].map(([k, l]) => <span key={k} className="rounded-md border border-white/10 px-2 py-0.5">{l}: <b>{sh.filter(x => x.wilayah === reg && x.status === k).length}</b></span>)}
      <span className="mx-1 text-slate-600">|</span><input aria-label="Cari PLTU" placeholder="Cari PLTU…" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value)}><option value="urut">Urutan laporan</option><option value="rendah">Pemenuhan terendah</option><option value="tinggi">Pemenuhan tertinggi</option><option value="besar">Kebutuhan terbesar</option></select>
      <Btn onClick={() => setMode(mode === 'grafik' ? 'tabel' : 'grafik')}>Tampilan {mode === 'grafik' ? 'Tabel' : 'Grafik'}</Btn><Btn onClick={() => window.print()}>Ekspor ke PDF</Btn></div>
    <div className="flex flex-wrap gap-1.5 mb-2 no-print"><span className="text-[11px] text-slate-400 self-center">Tahapan:</span>
      {[{ key: '', label: 'Semua', color: '#9aa3b2' }, ...STAGES].map(s => <button key={s.key} onClick={() => setStage(stage === s.key ? '' : s.key)} className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: s.color, background: stage === s.key ? s.color : 'transparent', color: stage === s.key ? '#15130d' : s.color }}>{s.label}</button>)}</div>
    {rows.length === 0 ? <Card><p className="text-xs">Data Belum Tersedia untuk filter ini.</p></Card> : mode === 'grafik'
      ? <Card title={stage ? `Volume ${STAGES.find(s => s.key === stage)?.label} — ${reg}` : `Pemenuhan Pasokan — ${reg}`}>
        <div className="flex gap-3 overflow-x-auto"><div style={{ width: 150, flexShrink: 0 }}><div className="text-[11px] text-slate-400 mb-1">Persentase pemenuhan</div>
          <ResponsiveContainer width="100%" height={H}><BarChart layout="vertical" data={rows} margin={M}><XAxis type="number" domain={[0, 100]} ticks={[0, 50, 100]} stroke="#9aa3b2" fontSize={10} tickFormatter={v => v + '%'} /><YAxis type="category" dataKey="pltu" hide />
            <Tooltip formatter={(v: any, _n: any, x: any) => [fmtPct(x.payload.p), 'Pemenuhan']} labelFormatter={(_l: any, x: any) => x?.[0]?.payload?.pltu} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <RBar dataKey={(r: any) => Math.min(100, r.p ?? 0)} background={{ fill: 'rgba(255,255,255,0.06)' }} barSize={14}>{rows.map((r, i) => <Cell key={i} fill={tone(r.p)} />)}<LabelList dataKey="p" position="right" formatter={(v: any) => v == null ? '—' : fmtNum(v, 0) + '%'} fill="#e8e6e1" fontSize={10} /></RBar></BarChart></ResponsiveContainer></div>
          <div className="flex-1" style={{ minWidth: 420 }}><div className="text-[11px] text-slate-400 mb-1">Volume per tahapan (MT){stage ? ' — hanya tahapan terpilih' : ''}</div>
            <ResponsiveContainer width="100%" height={H}><BarChart layout="vertical" data={rows} margin={M}><XAxis type="number" stroke="#9aa3b2" fontSize={10} tickFormatter={v => fmtNum(v / 1000) + 'rb'} /><YAxis type="category" dataKey="pltu" width={130} stroke="#9aa3b2" fontSize={11} interval={0} />
              <Tooltip formatter={(v: any, n: any) => [fmtNum(v) + ' MT', n]} contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              {STAGES.filter(s => keys.includes(s.key)).map(s => <RBar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} barSize={16}><LabelList dataKey={s.key} position="center" formatter={(v: any) => v > 6000 ? fmtNum(v) : ''} fill="#fff" fontSize={10} fontWeight={600} /></RBar>)}</BarChart></ResponsiveContainer></div>
          <div style={{ width: 250, flexShrink: 0 }}><div className="text-[11px] text-slate-400 mb-1">Sumber Tambang{stage ? '' : ' (aktif)'}</div><div style={{ paddingTop: 5 }}>{rows.map(r => <div key={r.pltu} style={{ height: ROW, lineHeight: `${ROW}px` }} className="text-[11px] truncate" title={r.sumberTxt}>{r.sumberTxt || <span className="text-slate-600">—</span>}</div>)}</div></div></div>
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">{STAGES.filter(s => keys.includes(s.key)).map(s => <span key={s.key}><span style={{ color: s.color }}>■</span> {s.label}</span>)}</div></Card>
      : <Card title={`Rincian ${reg}`}><DataTable rows={rows} cols={cols} name={`laporan-harian-${norm(reg)}`} /></Card>}
    <p className="text-[11px] text-slate-500">Pemenuhan = Σ D/S ÷ (Konfirmasi + Carry Over). Carry Over = Σ Jumlah berkonfirmasi Carry Over. {ds.rows.filter(r => !r.wilayah && r.n > 0).length > 0 && `${ds.rows.filter(r => !r.wilayah && r.n > 0).length} PLTU bershipment belum masuk wilayah mana pun (${ds.rows.filter(r => !r.wilayah && r.n > 0).map(r => r.pltu).join(', ')}).`}</p>
  </>
}
