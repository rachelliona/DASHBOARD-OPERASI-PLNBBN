import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import type { Rejected } from './domain/schema'
import { SOURCES } from './config/sources'
import { LOKASI_ROWS } from './config/lokasi'
import { snapBase } from './config/snapshots'
import { parseCsv } from './domain/csv'
import { nowWib } from './domain/format'
import { BULAN, parseMonthly, aggregatePlants, toShipRows } from './domain/monthly'
import { useAuth } from './auth'
export type Row = Record<string, any>
export type DS = { rows: Row[]; rejected: Rejected[]; source: string; at: string; headers?: string[]; headerRow?: number; errorCells?: number }
export type Stat = { state: string; msg?: string; at?: string }
export type PM = ReturnType<typeof parseMonthly>
export type MD = PM & { at: string }
export type Snap = { v: number; date: string; at: string; dashCsv?: string; bulan: string; all: PM; months: Record<string, PM> }
type St = { kinds: Record<string, DS>; raw: Record<string, DS>; status: Record<string, Stat>; threshold: number; intervalSec: number; bulanAktif: string
  monthly: MD | null; all: MD | null; months: Record<string, MD>; asOf: string; setAsOf: (d: string) => void; snapList: string[] | null; snapState: string; snapDashCsv?: string
  fetchSheet: (name: string) => Promise<void>; setKind: (k: string, d: DS) => void; setRaw: (n: string, d: DS) => void; setStatus: (n: string, s: Stat) => void; setThreshold: (n: number) => void; setIntervalSec: (n: number) => void; clear: () => void }
const Ctx = createContext<St>(null as any)
export const useStore = () => useContext(Ctx)
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [local, setK] = useState<Record<string, DS>>({}); const [raw, setR] = useState<Record<string, DS>>({}); const [status, setS] = useState<Record<string, Stat>>({})
  const [threshold, setT] = useState(() => Number(localStorage.getItem('pln-threshold')) || 70)
  const [intervalSec, setI] = useState(() => Number(localStorage.getItem('pln-interval')) || 60)
  const [asOf, setAsOfS] = useState(''); const [snap, setSnap] = useState<Snap | null>(null); const [snapList, setSnapList] = useState<string[] | null>(null); const [snapState, setSnapState] = useState('')
  const inflight = useRef(new Set<string>()); const busy = useRef(false); const rawRef = useRef<Record<string, DS>>({}); rawRef.current = raw; const asOfRef = useRef(''); asOfRef.current = asOf
  const liveBulan = BULAN[new Date(Date.now() + 7 * 36e5).getUTCMonth()]
  const monthsLive = useMemo(() => Object.fromEntries(BULAN.filter(b => raw[b]?.headers).map(b => [b, { ...parseMonthly({ headers: raw[b].headers!, rows: raw[b].rows }, b), at: raw[b].at }])) as Record<string, MD>, [raw])
  const dAll = raw['ALL Shipment']
  const allLive = useMemo<MD | null>(() => dAll?.headers ? { ...parseMonthly({ headers: dAll.headers, rows: dAll.rows }, 'Januari'), at: dAll.at } : null, [dAll])
  const snapMode = !!asOf
  const months = useMemo(() => snapMode ? Object.fromEntries(Object.entries(snap?.months ?? {}).map(([b, m]) => [b, { ...m, at: snap!.at }])) as Record<string, MD> : monthsLive, [snapMode, snap, monthsLive])
  const bulanAktif = snapMode && snap ? snap.bulan : liveBulan
  const monthly = months[bulanAktif] ?? null
  const all = snapMode ? (snap ? { ...snap.all, at: snap.at } : null) : allLive
  const kinds = useMemo(() => {
    const k: Record<string, DS> = { lokasi: { rows: LOKASI_ROWS, rejected: [], source: 'Master Data Pembangkit (konfigurasi)', at: '—' } }
    if (monthly && !monthly.missing.length) { const src = snapMode ? `Snapshot ${asOf}` : `Sheet ${bulanAktif} (otomatis)`; k.plant = { rows: aggregatePlants(monthly.ships), rejected: [], source: src, at: monthly.at }; k.shipment = { rows: toShipRows(monthly.ships), rejected: [], source: src, at: monthly.at } }
    return snapMode ? k : { ...k, ...local }
  }, [monthly, local, snapMode])
  const fetchSheet = async (name: string) => {
    const src = SOURCES.find(x => x.name === name); if (!src || inflight.current.has(name)) return
    inflight.current.add(name); setS(p => ({ ...p, [name]: { ...p[name], state: 'Memuat Data…' } })); const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000)
    try { const r = await fetch(src.url, { signal: c.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const p = parseCsv(await r.text()); if (!p.headers.length) throw new Error('Header tidak ditemukan'); const at = nowWib()
      setR(prev => ({ ...prev, [name]: { rows: p.rows, rejected: [], source: 'URL CSV', at, headers: p.headers, headerRow: p.headerRow, errorCells: p.errorCells } })); setS(prev => ({ ...prev, [name]: { state: 'Terhubung', at } }))
    } catch (e: any) { setS(prev => ({ ...prev, [name]: { ...prev[name], state: 'Gagal Diakses', msg: (e.name === 'AbortError' ? 'Waktu habis (30 dtk)' : e.message) + ' — kemungkinan diblokir CORS/jaringan' } })) } finally { clearTimeout(t); inflight.current.delete(name) } }
  const refreshAll = async () => { if (busy.current || asOfRef.current) return; busy.current = true; try { for (const [n, x] of Object.entries(rawRef.current)) if (x.source === 'URL CSV') await fetchSheet(n) } finally { busy.current = false } }
  const refreshRef = useRef(refreshAll); refreshRef.current = refreshAll
  const setAsOf = async (d: string) => {
    setAsOfS(d); setSnap(null); if (!d) { setSnapState(''); return }
    setSnapState('Memuat Snapshot…')
    try { const r = await fetch(`${snapBase()}/${d}.json`, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); setSnap(await r.json()); setSnapState('') } catch (e: any) { setSnapState('Gagal memuat snapshot: ' + e.message) }
  }
  useEffect(() => { if (user) fetchSheet(liveBulan) }, [user])
  useEffect(() => { if (!user) return; (async () => { try { const r = await fetch(snapBase() + '/index.json', { cache: 'no-store' }); if (!r.ok) throw new Error(); const j = await r.json(); setSnapList([...(j.dates ?? [])].sort()) } catch { setSnapList([]) } })() }, [user])
  useEffect(() => { const tick = () => { if (document.visibilityState === 'visible') refreshRef.current() }; const id = setInterval(tick, intervalSec * 1000); document.addEventListener('visibilitychange', tick); return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) } }, [intervalSec])
  return <Ctx.Provider value={{ fetchSheet, kinds, raw, status, threshold, intervalSec, bulanAktif, monthly, all, months, asOf, setAsOf, snapList, snapState, snapDashCsv: snapMode ? snap?.dashCsv : undefined,
    setIntervalSec: (n: number) => { localStorage.setItem('pln-interval', String(n)); setI(n) },
    setKind: (k, x) => setK(p => ({ ...p, [k]: x })), setRaw: (n, x) => setR(p => ({ ...p, [n]: x })), setStatus: (n, s) => setS(p => ({ ...p, [n]: s })),
    setThreshold: n => { localStorage.setItem('pln-threshold', String(n)); setT(n) }, clear: () => { setK({}); setR({}); setS({}) } }}>{children}</Ctx.Provider>
}
