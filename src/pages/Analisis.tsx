import { useMemo, useState } from 'react'
import { Brain, AlertTriangle, Lightbulb, CalendarClock, Siren } from 'lucide-react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TIP } from '../components/chartTheme'
import { Card, Empty, PageHead } from '../components/ui'
import { useBulan, useCmp } from './useBulan'
import { useStore } from '../store'
import { KATEGORI, SEV_COLOR, CMP_SHORT, buildInsights, todayRef, Sev } from '../domain/insight'
import { fmtNum } from '../domain/format'
import { REGIONS } from '../domain/status'
import { regionOf } from '../domain/monthly'
const SEVL: Record<Sev, string> = { tinggi: 'Prioritas tinggi', sedang: 'Perlu perhatian', rendah: 'Info' }
function Skor({ v }: { v: number }) { const c = v >= 80 ? '#34d399' : v >= 60 ? '#fbbf24' : '#fb7185'; const L = v >= 80 ? 'Sehat' : v >= 60 ? 'Waspada' : 'Kritis'
  return <div className="skor" style={{ ['--p' as any]: v, ['--t' as any]: c }}><div><b style={{ color: c }}>{v}</b><span>/100</span><em style={{ color: c }}>{L}</em></div></div> }
export default function Analisis() {
  const { asOf, all } = useStore(); const { b, bar, md, bulanIdx } = useBulan(); const [sev, setSev] = useState<Sev | ''>(''); const [kat, setKat] = useState(''); const [reg, setReg] = useState(''); const [lim, setLim] = useState(12)
  const { cmp, ui: cmpUi } = useCmp(); const ref = asOf ? Date.parse(asOf) : todayRef()
  const out = useMemo(() => md ? buildInsights({ ships: md.ships, ref, bulanIdx, base: all?.ships, cmp }) : null, [md, ref, bulanIdx, all, cmp])
  if (!md || !out) return <>{bar}<Empty /></>
  const vis = out.list.filter(i => (!sev || i.sev === sev) && (!kat || i.kat === kat) && (!reg || (i.pltu && regionOf(i.pltu) === reg)))
  const top = out.list.filter(i => i.sev === 'tinggi').slice(0, 3); const e = out.etaPol; const done = e.tepat + e.cepat + e.telat
  return <>
    <PageHead icon={Brain} color="#a78bfa" title="Analisis Cerdas" sub={<>Temuan otomatis dari sheet {b}: ketepatan ETA (kolom Tgl.), tahap tertahan, antrean, risiko pemenuhan PLTU, kualitas data, dan kinerja mitra — lengkap dengan perkiraan solusi. Ini dugaan dari data, bukan penyebab terkonfirmasi.</>} />
    {bar}
    <div className="mb-3">{cmpUi}</div>
    <section className="hero ai-hero" style={{ ['--hc' as any]: '#a78bfa' }}>
      <div className="ai-grid"><div className="flex flex-col items-center gap-1"><Skor v={out.skor} /><div className="text-[11px] text-slate-400">Skor kesehatan pasokan</div></div>
        <div className="grid gap-2 content-center">
          <div className="grid grid-cols-3 gap-2">{(['tinggi', 'sedang', 'rendah'] as Sev[]).map(s => <button key={s} onClick={() => setSev(sev === s ? '' : s)} className={'sevbox' + (sev === s ? ' on' : '')} style={{ ['--c' as any]: SEV_COLOR[s] }}><b>{out.ringkas[s]}</b><span>{SEVL[s]}</span></button>)}</div>
          <div className="text-xs text-slate-300 leading-relaxed">{out.ringkas.tinggi ? <>Ada <b>{out.ringkas.tinggi}</b> temuan prioritas tinggi. </> : <>Tidak ada temuan prioritas tinggi. </>}
            {done ? <>Dari {done} shipment ber-ETA yang sudah punya tanggal {CMP_SHORT[cmp]}, <b>{fmtNum(e.tepat + e.cepat)}</b> sesuai ETA dan <b style={{ color: '#fb7185' }}>{e.telat}</b> telat{e.rata ? ` (rata-rata +${fmtNum(e.rata, 1)} hari)` : ''}. </> : null}
            {out.bottleneck && <>Tahap yang paling banyak memakan waktu berlebih: <b>{out.bottleneck.nama}</b> ({out.bottleneck.n} shipment melewati P75).</>}</div></div></div>
      {top.length > 0 && <div className="mt-3"><div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">Perlu ditangani dulu</div><div className="grid md:grid-cols-3 gap-2">{top.map(i => <div key={i.id} className="topcard"><div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: SEV_COLOR[i.sev] }}><Siren size={13} />{i.kat}</div><div className="text-[13px] font-semibold mt-1">{i.judul}</div><div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{i.detail}</div></div>)}</div></div>}
    </section>
    <div className="grid lg:grid-cols-3 gap-3 mb-3">
      <Card title="Temuan per kategori — klik untuk menyaring"><div style={{ height: out.perKat.length * 30 + 20 }}><ResponsiveContainer><BarChart layout="vertical" data={out.perKat.map(k => ({ ...k, nama: k.kat }))} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}><XAxis type="number" allowDecimals={false} stroke="#b4bccb" fontSize={10} /><YAxis type="category" dataKey="nama" width={80} stroke="#b4bccb" fontSize={11} interval={0} />
        <Tooltip formatter={(v: any, _n, p: any) => [`${v} temuan (${p.payload.tinggi} prioritas tinggi)`, KATEGORI[p.payload.kat]]} {...TIP} /><RBar dataKey="n" barSize={16} radius={[0, 8, 8, 0]} cursor="pointer" onClick={(d: any) => setKat(kat === d.kat ? '' : d.kat)}>{out.perKat.map(k => <Cell key={k.kat} fill={k.tinggi ? '#fb7185' : '#fbbf24'} fillOpacity={kat && kat !== k.kat ? .3 : 1} />)}</RBar></BarChart></ResponsiveContainer></div></Card>
      <Card title={`Ketepatan ETA (Tgl.) vs ${CMP_SHORT[cmp]}`}><div className="etabar"><div style={{ flex: e.cepat + e.tepat || .001, background: '#34d399' }} title="Sesuai/lebih cepat" /><div style={{ flex: e.telat || .001, background: '#fb7185' }} title="Telat" /><div style={{ flex: e.belum || .001, background: '#fbbf24' }} title="Lewat ETA belum tiba" /></div>
        <ul className="text-xs mt-3 grid gap-1.5"><li className="flex justify-between"><span><i className="dot" style={{ background: '#34d399' }} />Sesuai ETA (±1 hari) / lebih cepat</span><b>{e.tepat + e.cepat}</b></li><li className="flex justify-between"><span><i className="dot" style={{ background: '#fb7185' }} />Telat dari ETA</span><b>{e.telat}</b></li><li className="flex justify-between"><span><i className="dot" style={{ background: '#fbbf24' }} />Lewat ETA, realisasi belum tercatat</span><b>{e.belum}</b></li><li className="flex justify-between text-slate-400"><span>Total shipment ber-ETA</span><b>{e.total}</b></li></ul></Card>
      <Card title="Durasi tiap tahap vs kebiasaan"><div className="grid gap-1.5">{out.stats.map((s, i) => s.med == null ? null : <div key={i} className="text-[11px]"><div className="flex justify-between text-slate-300"><span>{['SI → TA POL', 'TA POL → Sandar', 'Sandar → Muat', 'Durasi muat', 'Muat → Berlayar', 'Pelayaran', 'TA PLTU → Sandar', 'Sandar → Bongkar', 'Durasi bongkar'][i]}</span><span className="num">median {fmtNum(s.med, 1)} · P75 {fmtNum(s.p75, 1)} hari</span></div><div className="mini"><i style={{ width: Math.min(100, (s.med / Math.max(...out.stats.map(x => x.p75 ?? 0), 1)) * 100) + '%' }} /></div></div>)}</div></Card></div>
    <Card title={`Daftar temuan & perkiraan solusi (${vis.length})`} right={<div className="flex gap-2 text-xs no-print"><select aria-label="Wilayah" value={reg} onChange={e => setReg(e.target.value)}><option value="">Semua wilayah</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select>{(sev || kat || reg) && <button className="text-[#f2c76b] underline" onClick={() => { setSev(''); setKat(''); setReg('') }}>Reset</button>}</div>}>
      {vis.length === 0 ? <p className="text-xs text-emerald-300">Tidak ada temuan pada saringan ini.</p> : <div className="grid gap-2">{vis.slice(0, lim).map(i => <article key={i.id} className="finding" style={{ ['--c' as any]: SEV_COLOR[i.sev] }}>
        <div className="flex flex-wrap items-center gap-2 mb-1"><span className="sevtag">{SEVL[i.sev]}</span><span className="kat">{i.kat}</span>{i.pltu && <span className="text-[11px] text-slate-400">{i.pltu}</span>}</div>
        <h3 className="text-[13px] font-bold">{i.judul}</h3><p className="text-xs text-slate-300 mt-1 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5 text-slate-400" /><span>{i.detail}</span></p>
        <p className="text-xs mt-1.5 flex gap-1.5" style={{ color: 'var(--ok)' }}><Lightbulb size={13} className="shrink-0 mt-0.5" /><span><b>Solusi:</b> {i.solusi}</span></p></article>)}</div>}
      {vis.length > lim && <button className="btn rounded-lg px-3 py-1 text-xs mt-3" onClick={() => setLim(lim + 20)}>Tampilkan lebih banyak ({vis.length - lim})</button>}
      <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><CalendarClock size={11} />Dihitung ulang tiap data diperbarui. Ambang "tahap tertahan" memakai P75 durasi seluruh shipment bulan ini; toleransi ETA 1 hari.</p></Card>
  </>
}
