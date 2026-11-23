import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, ArrowRight, X } from 'lucide-react'
import { BULAN } from '../domain/monthly'
import { buildInsights, SEV_COLOR, todayRef, type Insight } from '../domain/insight'
import { useStore } from '../store'
import { readCmp } from '../pages/useBulan'
import { useAuth } from '../auth'
import { isAdmin } from '../config/nav'
import { useSI } from '../si/store'
import { periksa } from '../si/logic'

const KEY = 'pln-notif-seen'
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const writeSeen = (a: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-400))) } catch { /* tanpa penyimpanan */ } }
const SEV_LABEL = { tinggi: 'Prioritas tinggi', sedang: 'Perlu perhatian', rendah: 'Info' } as const

/** Lonceng notifikasi: temuan otomatis berprioritas tinggi/sedang dari Analisis. Status "sudah dibaca" disimpan per peramban. */
export default function NotifBell() {
  const { monthly, bulanAktif, asOf, all } = useStore(); const [open, setOpen] = useState(false); const [seen, setSeen] = useState<string[]>(readSeen); const box = useRef<HTMLDivElement>(null)
  const ref = asOf ? Date.parse(asOf) : todayRef()
  const list: Insight[] = useMemo(() => {
    if (!monthly) return []
    try { return buildInsights({ ships: monthly.ships, ref, bulanIdx: BULAN.indexOf(bulanAktif), base: all?.ships, cmp: readCmp() }).list.filter(i => i.sev !== 'rendah').slice(0, 25) } catch { return [] }
  }, [monthly, ref, bulanAktif, all])
  // Nomor SI dobel: hanya diberitahukan ke admin lewat lonceng (tidak dipampang di halaman SI)
  const { user } = useAuth(); const si = useSI(); const thn = String(new Date().getFullYear())
  const dob = useMemo(() => !isAdmin(user) ? [] : [...periksa(si.rows, si.blok).dobel].filter(([k]) => k.startsWith(thn + ':')).slice(0, 10).map(([k, v]) => ({ id: 'dobel-' + k + '-' + v.length, judul: `Nomor SI ${k.split(':')[1]}/${thn} dipakai ${v.length} SI`, detail: v.map(r => r.pemohon ? `${r.mitra || r.tambang || '—'} (${r.pemohon})` : (r.mitra || r.tambang || '—')).join(' · ') })), [si.rows, si.blok, user, thn])
  const unread = [...dob, ...list].filter(i => !seen.includes(i.id)); const high = dob.filter(i => !seen.includes(i.id)).length + list.filter(i => !seen.includes(i.id) && i.sev === 'tinggi').length
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [open])
  const mark = (ids: string[]) => { const n = [...new Set([...seen, ...ids])]; setSeen(n); writeSeen(n) }
  return <div className="notif" ref={box}>
    <button className="theme-btn notif-btn" aria-label={`Notifikasi${unread.length ? `, ${unread.length} belum dibaca` : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(v => !v)}>
      <Bell size={16} />{unread.length > 0 && <span className={'notif-dot' + (high ? ' hot' : '')}>{unread.length > 9 ? '9+' : unread.length}</span>}</button>
    {open && <div className="notif-panel" role="dialog" aria-label="Notifikasi">
      <div className="notif-head"><b>Notifikasi</b><span className="text-[11px] text-slate-400">{unread.length ? `${unread.length} belum dibaca` : 'Semua sudah dibaca'}</span>
        <button className="notif-link ml-auto" disabled={!unread.length} onClick={() => mark([...dob, ...list].map(i => i.id))}><CheckCheck size={13} />Tandai dibaca</button>
        <button className="notif-x" aria-label="Tutup" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <div className="notif-list">{dob.map(i => <Link key={i.id} to="/si" onClick={() => { mark([i.id]); setOpen(false) }} className={'notif-item' + (seen.includes(i.id) ? ' read' : '')} style={{ ['--c' as any]: '#f87171' }}><span className="notif-bar" /><span className="min-w-0"><span className="notif-kat">Prioritas tinggi · Nomor SI dobel</span><span className="notif-t">{i.judul}</span><span className="notif-d">{i.detail}. Perbaiki di sheet SI / menu SI.</span></span></Link>)}{list.length === 0 && dob.length === 0 ? <p className="notif-empty">Tidak ada temuan yang perlu ditindaklanjuti. Pasokan berjalan sesuai jadwal.</p>
        : list.map(i => <Link key={i.id} to="/analisis" onClick={() => { mark([i.id]); setOpen(false) }} className={'notif-item' + (seen.includes(i.id) ? ' read' : '')} style={{ ['--c' as any]: SEV_COLOR[i.sev] }}>
          <span className="notif-bar" /><span className="min-w-0"><span className="notif-kat">{SEV_LABEL[i.sev]} · {i.kat}</span><span className="notif-t">{i.judul}</span><span className="notif-d">{i.detail}</span></span></Link>)}</div>
      <Link to="/analisis" onClick={() => setOpen(false)} className="notif-foot">Buka Analisis <ArrowRight size={13} /></Link></div>}
  </div>
}
