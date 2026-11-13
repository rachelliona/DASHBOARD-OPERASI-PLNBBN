import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { fmtDate } from '../domain/format'
const NM = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], HR = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']
const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
/** Pilih tanggal data lewat kalender kecil: hanya tanggal yang punya snapshot yang bisa dipilih; "Langsung" = data hari ini. */
export default function DateSelector({ className = '' }: { className?: string }) {
  const { asOf, setAsOf, snapList, snapState } = useStore(); const list = useMemo(() => [...(snapList ?? [])].reverse(), [snapList]); const i = list.indexOf(asOf)
  const has = useMemo(() => new Set(snapList ?? []), [snapList]); const [open, setOpen] = useState(false); const box = useRef<HTMLDivElement>(null), pop = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null); const [pos, setPos] = useState<{ top: number; left: number }>({ top: 60, left: 8 })
  const base = asOf || list[0] || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); const [ym, setYm] = useState<[number, number]>([+base.slice(0, 4), +base.slice(5, 7) - 1])
  useEffect(() => { setYm([+base.slice(0, 4), +base.slice(5, 7) - 1]) }, [base])
  useEffect(() => { if (!open) return; const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setOpen(false) }, k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }; document.addEventListener('mousedown', f); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k) } }, [open])
  useEffect(() => { if (!open) return; const f = () => { const r = btn.current?.getBoundingClientRect(); if (r) setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.right - 272, window.innerWidth - 280)) }) }; f(); window.addEventListener('resize', f); window.addEventListener('scroll', f, true); return () => { window.removeEventListener('resize', f); window.removeEventListener('scroll', f, true) } }, [open])
  const older = () => setAsOf(asOf ? list[i + 1] ?? asOf : list[0] ?? ''); const newer = () => setAsOf(i > 0 ? list[i - 1] : '')
  const [y, m] = ym; const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; const nd = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells = [...Array(first).fill(0), ...Array.from({ length: nd }, (_, k) => k + 1)]; const mv = (d: number) => setYm(([yy, mm]) => { const t = mm + d; return [yy + Math.floor(t / 12), ((t % 12) + 12) % 12] })
  const todayK = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10)
  return <div ref={box} className={'relative flex items-center gap-1 text-xs ' + className} title={snapList && snapList.length === 0 ? 'Belum ada snapshot harian. Jalankan workflow "Snapshot Harian" di GitHub Actions.' : 'Pilih tanggal untuk melihat keadaan data pada hari itu'}>
    <button aria-label="Tanggal sebelumnya" className="p-1 rounded hover:bg-white/10 disabled:opacity-30" disabled={!list.length || (asOf !== '' && i === list.length - 1)} onClick={older}><ChevronLeft size={14} /></button>
    <button ref={btn} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Buka kalender pilih tanggal" className="datebtn" onClick={() => setOpen(o => !o)}><CalendarDays size={14} className="text-[#e6b457]" /><span>{asOf ? fmtDate(asOf) : 'Langsung (hari ini)'}</span></button>
    <button aria-label="Tanggal berikutnya" className="p-1 rounded hover:bg-white/10 disabled:opacity-30" disabled={!asOf} onClick={newer}><ChevronRight size={14} /></button>
    {snapState && <span className="text-amber-300">{snapState}</span>}
    {open && createPortal(<div ref={pop} role="dialog" aria-label="Kalender" className="cal-pop" style={{ top: pos.top, left: pos.left }}>
      <div className="cal-h"><button aria-label="Bulan sebelumnya" onClick={() => mv(-1)}><ChevronLeft size={15} /></button><b>{NM[m]} {y}</b><button aria-label="Bulan berikutnya" onClick={() => mv(1)}><ChevronRight size={15} /></button></div>
      <div className="cal-g">{HR.map(h => <i key={h} className="cal-w">{h}</i>)}{cells.map((d, k) => { if (!d) return <span key={'e' + k} />; const kk = key(y, m, d), ok = has.has(kk)
        return <button key={kk} disabled={!ok} className={'cal-d' + (ok ? ' ok' : '') + (kk === asOf ? ' on' : '') + (kk === todayK ? ' td' : '')} onClick={() => { setAsOf(kk); setOpen(false) }} title={ok ? 'Data per ' + fmtDate(kk) : 'Tidak ada snapshot'}>{d}</button> })}</div>
      <div className="cal-f"><button className={'cal-live' + (!asOf ? ' on' : '')} onClick={() => { setAsOf(''); setOpen(false) }}><i className="pulse" />Langsung (hari ini)</button><span>{(snapList ?? []).length} tanggal tersedia</span></div></div>, document.body)}
  </div>
}
