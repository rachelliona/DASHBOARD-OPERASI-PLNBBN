import { createContext, useContext, useState, ReactNode } from 'react'
import type { Rejected } from './domain/schema'
export type Row = Record<string, any>
export type DS = { rows: Row[]; rejected: Rejected[]; source: string; at: string; headers?: string[] }
export type Stat = { state: string; msg?: string; at?: string }
type St = { kinds: Record<string, DS>; raw: Record<string, DS>; status: Record<string, Stat>; threshold: number
  setKind: (k: string, d: DS) => void; setRaw: (n: string, d: DS) => void; setStatus: (n: string, s: Stat) => void; setThreshold: (n: number) => void; clear: () => void }
const Ctx = createContext<St>(null as any)
export const useStore = () => useContext(Ctx)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [kinds, setK] = useState<Record<string, DS>>({}); const [raw, setR] = useState<Record<string, DS>>({}); const [status, setS] = useState<Record<string, Stat>>({})
  const [threshold, setT] = useState(() => Number(localStorage.getItem('pln-threshold')) || 70)
  return <Ctx.Provider value={{ kinds, raw, status, threshold,
    setKind: (k, d) => setK(p => ({ ...p, [k]: d })), setRaw: (n, d) => setR(p => ({ ...p, [n]: d })), setStatus: (n, s) => setS(p => ({ ...p, [n]: s })),
    setThreshold: n => { localStorage.setItem('pln-threshold', String(n)); setT(n) }, clear: () => { setK({}); setR({}); setS({}) } }}>{children}</Ctx.Provider>
}
