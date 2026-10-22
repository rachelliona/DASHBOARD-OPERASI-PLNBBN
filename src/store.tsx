import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { Rejected } from './domain/schema'
import { SOURCES } from './config/sources'
import { parseCsv } from './domain/csv'
import { nowWib } from './domain/format'
export type Row = Record<string, any>
export type DS = { rows: Row[]; rejected: Rejected[]; source: string; at: string; headers?: string[]; headerRow?: number; errorCells?: number }
export type Stat = { state: string; msg?: string; at?: string }
type St = { kinds: Record<string, DS>; raw: Record<string, DS>; status: Record<string, Stat>; threshold: number; intervalSec: number; setIntervalSec: (n: number) => void
  fetchSheet: (name: string) => Promise<void>; setKind: (k: string, d: DS) => void; setRaw: (n: string, d: DS) => void; setStatus: (n: string, s: Stat) => void; setThreshold: (n: number) => void; clear: () => void }
const Ctx = createContext<St>(null as any)
export const useStore = () => useContext(Ctx)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [kinds, setK] = useState<Record<string, DS>>({}); const [raw, setR] = useState<Record<string, DS>>({}); const [status, setS] = useState<Record<string, Stat>>({})
  const [threshold, setT] = useState(() => Number(localStorage.getItem('pln-threshold')) || 70)
  const [intervalSec, setI] = useState(() => Number(localStorage.getItem('pln-interval')) || 60)
  const inflight = useRef(new Set<string>()); const busy = useRef(false); const rawRef = useRef<Record<string, DS>>({}); rawRef.current = raw
  const fetchSheet = async (name: string) => {
    const src = SOURCES.find(x => x.name === name); if (!src || inflight.current.has(name)) return
    inflight.current.add(name)
    setS(p => ({ ...p, [name]: { ...p[name], state: 'Memuat Data…' } })); const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000)
    try { const r = await fetch(src.url, { signal: c.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const p = parseCsv(await r.text()); if (!p.headers.length) throw new Error('Header tidak ditemukan'); const at = nowWib()
      setR(prev => ({ ...prev, [name]: { rows: p.rows, rejected: [], source: 'URL CSV', at, headers: p.headers, headerRow: p.headerRow, errorCells: p.errorCells } })); setS(prev => ({ ...prev, [name]: { state: 'Terhubung (belum dipetakan)', at } }))
    } catch (e: any) { setS(prev => ({ ...prev, [name]: { ...prev[name], state: 'Gagal Diakses', msg: (e.name === 'AbortError' ? 'Waktu habis (30 dtk)' : e.message) + ' — kemungkinan diblokir CORS/jaringan' } })) } finally { clearTimeout(t); inflight.current.delete(name) } }
  const refreshAll = async () => { if (busy.current) return; busy.current = true; try { for (const [n, d] of Object.entries(rawRef.current)) if (d.source === 'URL CSV') await fetchSheet(n) } finally { busy.current = false } }
  const refreshRef = useRef(refreshAll); refreshRef.current = refreshAll
  useEffect(() => { const tick = () => { if (document.visibilityState === 'visible') refreshRef.current() }; const id = setInterval(tick, intervalSec * 1000); document.addEventListener('visibilitychange', tick); return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) } }, [intervalSec])
  return <Ctx.Provider value={{ fetchSheet, kinds, raw, status, threshold, intervalSec, setIntervalSec: (n: number) => { localStorage.setItem('pln-interval', String(n)); setI(n) },
    setKind: (k, d) => setK(p => ({ ...p, [k]: d })), setRaw: (n, d) => setR(p => ({ ...p, [n]: d })), setStatus: (n, s) => setS(p => ({ ...p, [n]: s })),
    setThreshold: n => { localStorage.setItem('pln-threshold', String(n)); setT(n) }, clear: () => { setK({}); setR({}); setS({}) } }}>{children}</Ctx.Provider>
}
