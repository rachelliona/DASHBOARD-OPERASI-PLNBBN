import { useMemo, useState } from 'react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TIP } from './chartTheme'
import { Card } from './ui'
import { DataTable } from './DataTable'
import { fmtNum, parseIdNumber, parseIdDate } from '../domain/format'
import { BULAN } from '../domain/monthly'
import { norm } from '../domain/status'
type Row = Record<string, string>
const PAL = ['#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#f97316', '#22d3ee', '#e879f9']
const GOOD = /aktif|valid|berlaku|lulus|sesuai|lengkap|ada\b|ya\b|ok\b|selesai|terbit|clear|memenuhi/i, BAD = /expired|kadaluarsa|habis|mati|tidak|belum|gagal|ditolak|reject|batal|nonaktif|tutup|kurang/i, MID = /proses|perpanjang|menunggu|pending|sebagian|evaluasi|review|diajukan/i
const toneOf = (v: string, i: number) => BAD.test(v) ? '#fb7185' : MID.test(v) ? '#fbbf24' : GOOD.test(v) ? '#34d399' : PAL[i % PAL.length]
const isDay = (t: number) => Math.round((t - Date.now()) / 864e5)
function analyse(headers: string[], rows: Row[]) {
  const body = rows.filter(r => !/^(sub)?total$/i.test(Object.values(r).find(v => v?.trim())?.trim() ?? ''))
  const stat = headers.map(h => { const v = body.map(r => (r[h] ?? '').trim()).filter(x => x && x !== '-' && !/^#/.test(x)); const nums = v.filter(x => parseIdNumber(x) != null && /\d/.test(x) && !/[a-z]/i.test(x.replace(/[%.,\s]/g, ''))); const dates = v.filter(x => parseIdDate(x)); const uniq = new Set(v)
    return { h, n: v.length, num: v.length ? nums.length / v.length : 0, date: v.length ? dates.length / v.length : 0, uniq: uniq.size, vals: v } })
  const dateCols = stat.filter(s => s.n >= 2 && s.date >= .6 && s.num < .9 || (s.n >= 2 && s.date >= .6 && /tgl|tanggal|berlaku|exp|akhir|valid|masa|habis/i.test(s.h)))
  const dateSet = new Set(dateCols.map(s => s.h))
  const numCols = stat.filter(s => s.n >= 2 && s.num >= .6 && !dateSet.has(s.h) && !/^(no|nomor|no\.|urut|#|id|kode|tgl|tanggal|bulan|tahun)\b/i.test(s.h.trim()))
  const numSet = new Set(numCols.map(s => s.h))
  const catCols = stat.filter(s => !numSet.has(s.h) && !dateSet.has(s.h) && s.n >= 3 && s.uniq >= 2 && s.uniq <= Math.min(8, Math.ceil(s.n / 2)))
  const catSet = new Set(catCols.map(s => s.h))
  const label = stat.find(s => !numSet.has(s.h) && !dateSet.has(s.h) && !catSet.has(s.h) && s.n >= 2 && s.uniq >= s.n * .6) ?? stat.find(s => !numSet.has(s.h) && !dateSet.has(s.h) && s.n >= 2) ?? stat[0]
  const monthCols = headers.filter(h => BULAN.some(b => norm(h).startsWith(norm(b).slice(0, 3)) && norm(h).length <= 12))
  return { body, numCols, dateCols, catCols, label, monthCols, stat }
}
const sumOrAvg = (h: string, vals: string[]) => { const n = vals.map(parseIdNumber).filter((x): x is number => x != null); const avg = /%|persen|rasio|rata|avg|rate|skor|nilai/i.test(h); return { v: avg ? n.reduce((a, b) => a + b, 0) / (n.length || 1) : n.reduce((a, b) => a + b, 0), avg } }
export default function SheetViz({ name, headers, rows }: { name: string; headers: string[]; rows: Row[] }) {
  const A = useMemo(() => analyse(headers, rows), [headers, rows]); const [view, setView] = useState<'visual' | 'tabel'>('visual'); const [q, setQ] = useState(''); const [cat, setCat] = useState<[string, string] | null>(null); const [lim, setLim] = useState(24)
  const defNum = A.numCols.filter(c => !A.monthCols.includes(c.h)).sort((a, b) => b.vals.reduce((s, x) => s + (parseIdNumber(x) ?? 0), 0) - a.vals.reduce((s, x) => s + (parseIdNumber(x) ?? 0), 0))[0]?.h ?? A.numCols[0]?.h
  const [mc, setMc] = useState(defNum ?? ''); const lab = A.label?.h ?? headers[0]
  const filtered = A.body.filter(r => (!cat || (r[cat[0]] ?? '').trim() === cat[1]) && (!q || Object.values(r).some(v => v?.toLowerCase().includes(q.toLowerCase()))))
  const kpis = A.numCols.filter(c => !A.monthCols.includes(c.h)).slice(0, 4)
  const exp = A.dateCols.find(c => /berlaku|exp|akhir|valid|habis|sampai|masa/i.test(c.h))
  const expInfo = exp ? (() => { let ex = 0, soon = 0, ok = 0, none = 0; for (const r of A.body) { const d = parseIdDate(r[exp.h] ?? ''); if (!d) { none++; continue } const k = isDay(Date.parse(d)); if (k < 0) ex++; else if (k <= 60) soon++; else ok++ } return { ex, soon, ok, none } })() : null
  const top = mc ? A.body.map(r => ({ nama: (r[lab] ?? '').trim(), v: parseIdNumber(r[mc]) })).filter(x => x.nama && x.v != null && x.v !== 0).sort((a, b) => b.v! - a.v!).slice(0, 12) : []
  const tab = <DataTable rows={filtered as any} cols={headers.map(h => ({ key: h, label: h }))} name={name} />
  return <>
    <div className="flex flex-wrap items-center gap-2 mb-3 no-print"><div className="vsw"><button className={'vsw-b' + (view === 'visual' ? ' on' : '')} onClick={() => setView('visual')}>Visual</button><button className={'vsw-b' + (view === 'tabel' ? ' on' : '')} onClick={() => setView('tabel')}>Tabel</button></div>
      <input value={q} onChange={e => { setQ(e.target.value); setLim(24) }} placeholder="Cari di sheet ini…" aria-label="Cari" className="w-52" /><span className="text-xs text-slate-400">{fmtNum(filtered.length)} dari {fmtNum(A.body.length)} baris</span></div>
    {view === 'tabel' ? <Card title={`${fmtNum(filtered.length)} baris`}>{tab}</Card> : <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3"><div className="sk" style={{ ['--c' as any]: '#38bdf8' }}><span>Jumlah baris</span><b>{fmtNum(A.body.length)}</b></div>
        {kpis.slice(0, 3).map((c, i) => { const s = sumOrAvg(c.h, c.vals); return <div key={c.h} className="sk" style={{ ['--c' as any]: PAL[i + 1] }}><span title={c.h}>{c.h}{s.avg ? ' (rata-rata)' : ' (total)'}</span><b>{fmtNum(s.v, s.avg ? 1 : 0)}</b></div> })}</div>
      {expInfo && <Card title={`Masa berlaku — kolom "${exp!.h}"`}><div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">{[['Habis', expInfo.ex, '#fb7185'], ['≤ 60 hari', expInfo.soon, '#fbbf24'], ['Aman', expInfo.ok, '#34d399'], ['Tanpa tanggal', expInfo.none, '#64748b']].map(([l, n, c]) => <div key={l as string} style={{ flex: (n as number) || 0.001, background: c as string }} title={`${l}: ${n}`} />)}</div>
        <div className="flex flex-wrap gap-2 text-xs">{[['Sudah habis', expInfo.ex, '#fb7185'], ['Habis ≤ 60 hari', expInfo.soon, '#fbbf24'], ['Masih aman', expInfo.ok, '#34d399'], ['Tanpa tanggal', expInfo.none, '#64748b']].map(([l, n, c]) => <span key={l as string} className="fchip" style={{ ['--c' as any]: c }}>{l} <b>{n}</b></span>)}</div></Card>}
      {(A.catCols.length > 0 || top.length > 0) && <div className="grid lg:grid-cols-2 gap-3 mb-3">
        {A.catCols.slice(0, 2).map(c => { const cnt = new Map<string, number>(); A.body.forEach(r => { const v = (r[c.h] ?? '').trim(); if (v) cnt.set(v, (cnt.get(v) ?? 0) + 1) }); const arr = [...cnt].sort((a, b) => b[1] - a[1]); const tot = arr.reduce((a, b) => a + b[1], 0) || 1
          return <Card key={c.h} title={`Sebaran: ${c.h}`}><div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">{arr.map(([v, n], i) => <div key={v} style={{ flex: n, background: toneOf(v, i) }} title={`${v}: ${n}`} />)}</div>
            <div className="flex flex-wrap gap-1.5">{arr.map(([v, n], i) => <button key={v} onClick={() => setCat(cat && cat[0] === c.h && cat[1] === v ? null : [c.h, v])} className={'fchip' + (cat && cat[0] === c.h && cat[1] === v ? ' on' : '')} style={{ ['--c' as any]: toneOf(v, i) }}>{v} <b>{n} · {Math.round(n / tot * 100)}%</b></button>)}</div></Card> })}
        {top.length > 0 && <Card title={`Peringkat berdasarkan ${mc}`} right={A.numCols.length > 1 ? <select aria-label="Kolom angka" value={mc} onChange={e => setMc(e.target.value)} className="text-xs max-w-[190px]">{A.numCols.map(c => <option key={c.h}>{c.h}</option>)}</select> : undefined}>
          <div style={{ height: top.length * 26 + 20 }}><ResponsiveContainer><BarChart layout="vertical" data={top} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}><XAxis type="number" stroke="#b4bccb" fontSize={10} tickFormatter={v => fmtNum(v)} /><YAxis type="category" dataKey="nama" width={130} stroke="#b4bccb" fontSize={10.5} interval={0} tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + '…' : v} />
            <Tooltip formatter={(v: any) => [fmtNum(v, 1), mc]} {...TIP} /><RBar dataKey="v" barSize={14} radius={[0, 7, 7, 0]}>{top.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</RBar></BarChart></ResponsiveContainer></div></Card>}</div>}
      {cat && <p className="text-xs mb-2">Disaring: {cat[0]} = <b>{cat[1]}</b> <button className="text-[#f2c76b] underline ml-1" onClick={() => setCat(null)}>lepas</button></p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{filtered.slice(0, lim).map((r, i) => <RowCard key={i} r={r} A={A} headers={headers} lab={lab} />)}</div>
      {filtered.length > lim && <button className="btn rounded-lg px-3 py-1 text-xs mt-3" onClick={() => setLim(lim + 24)}>Tampilkan lebih banyak ({filtered.length - lim})</button>}</>}
  </>
}
function RowCard({ r, A, headers, lab }: { r: Row; A: ReturnType<typeof analyse>; headers: string[]; lab: string }) {
  const [open, setOpen] = useState(false); const title = (r[lab] ?? '').trim() || '—'
  const used = new Set([lab]); const cats = A.catCols.map(c => { used.add(c.h); return [c.h, (r[c.h] ?? '').trim()] as const }).filter(x => x[1])
  const dates = A.dateCols.map(c => { used.add(c.h); const d = parseIdDate(r[c.h] ?? ''); return d ? { h: c.h, d, k: isDay(Date.parse(d)), exp: /berlaku|exp|akhir|valid|habis|sampai|masa/i.test(c.h) } : null }).filter(Boolean) as { h: string; d: string; k: number; exp: boolean }[]
  const months = A.monthCols.map(h => { used.add(h); return parseIdNumber(r[h]) ?? 0 }); const mx = Math.max(...months, 1)
  const nums = A.numCols.filter(c => !A.monthCols.includes(c.h)).map(c => { used.add(c.h); return { h: c.h, v: parseIdNumber(r[c.h]) } }).filter(x => x.v != null)
  const rest = headers.filter(h => !used.has(h) && (r[h] ?? '').trim() && !/^#/.test(r[h].trim()))
  const accent = cats[0] ? toneOf(cats[0][1], 0) : dates.find(x => x.exp) ? (dates.find(x => x.exp)!.k < 0 ? '#fb7185' : dates.find(x => x.exp)!.k <= 60 ? '#fbbf24' : '#34d399') : '#38bdf8'
  return <article className="vcard" style={{ ['--c' as any]: accent }}>
    <h3 title={title}>{title}</h3>
    {(cats.length > 0 || dates.length > 0) && <div className="flex flex-wrap gap-1.5 mt-2">{cats.map(([h, v], i) => <span key={h} className="vtag" style={{ ['--c' as any]: toneOf(v, i) }} title={h}>{v}</span>)}
      {dates.map(x => <span key={x.h} className="vtag" style={{ ['--c' as any]: x.exp ? (x.k < 0 ? '#fb7185' : x.k <= 60 ? '#fbbf24' : '#34d399') : '#94a3b8' }} title={x.h}>{x.h}: {x.d.split('-').reverse().join('/')}{x.exp ? (x.k < 0 ? ` · habis ${-x.k} hr` : ` · ${x.k} hr lagi`) : ''}</span>)}</div>}
    {nums.length > 0 && <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">{nums.slice(0, 4).map(n => <div key={n.h} className="min-w-0"><div className="text-[10px] text-slate-400 truncate" title={n.h}>{n.h}</div><div className="num text-[15px] font-bold">{fmtNum(n.v, Math.abs(n.v!) < 100 && n.v! % 1 ? 1 : 0)}</div></div>)}</div>}
    {months.some(x => x > 0) && <div className="spark mt-3" title="Per bulan">{months.map((v, i) => <i key={i} title={`${A.monthCols[i]}: ${fmtNum(v)}`} style={{ height: Math.max(2, v / mx * 34) }} />)}</div>}
    {rest.length > 0 && <><button className="text-[11px] text-[#f2c76b] mt-2.5" onClick={() => setOpen(!open)}>{open ? 'Sembunyikan' : `Lihat ${rest.length} kolom lain`}</button>
      {open && <dl className="mt-1.5 grid gap-1 text-[11.5px]">{rest.map(h => <div key={h} className="flex gap-2"><dt className="text-slate-400 shrink-0 w-[38%] truncate" title={h}>{h}</dt><dd className="min-w-0 break-words">{r[h]}</dd></div>)}</dl>}</>}
  </article>
}
