import { useSyncExternalStore } from 'react'
import { Kontrak, newId, seedRows, clusterOf } from './domain/kontrak'
const KEY = 'pln-kontrak-v1', AKEY = 'pln-kontrak-alias-v1'
type State = { rows: Kontrak[]; alias: Record<string, string>; custom: boolean }
function load(): State {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); const a = JSON.parse(localStorage.getItem(AKEY) || '{}'); if (Array.isArray(r) && r.length) return { rows: r, alias: a && typeof a === 'object' ? a : {}, custom: true } } catch { /* tanpa penyimpanan */ }
  try { const a = JSON.parse(localStorage.getItem(AKEY) || '{}'); return { rows: seedRows(), alias: a && typeof a === 'object' ? a : {}, custom: false } } catch { return { rows: seedRows(), alias: {}, custom: false } }
}
let state: State = load(); const subs = new Set<() => void>()
const emit = (next: State) => { state = next; try { localStorage.setItem(KEY, JSON.stringify(next.rows)); localStorage.setItem(AKEY, JSON.stringify(next.alias)) } catch { /* abaikan */ } subs.forEach(f => f()) }
const fix = (r: Kontrak): Kontrak => ({ ...r, gar: Math.max(0, +r.gar || 0), vol: Math.max(0, +r.vol || 0), status: r.status ? 1 : 0 })
export const kontrakActions = {
  set: (rows: Kontrak[]) => emit({ ...state, rows: rows.map(fix), custom: true }),
  add: (r: Omit<Kontrak, 'id'>) => emit({ ...state, rows: [...state.rows, fix({ ...r, id: newId() })], custom: true }),
  patch: (id: string, p: Partial<Kontrak>) => emit({ ...state, rows: state.rows.map(r => r.id === id ? fix({ ...r, ...p, ...(p.gar != null && p.cluster == null ? { cluster: clusterOf(+p.gar) } : {}) }) : r), custom: true }),
  remove: (id: string) => emit({ ...state, rows: state.rows.filter(r => r.id !== id), custom: true }),
  /** ganti nama master (pelanggan = 'pelanggan', pemasok = 'tambang') di semua kontrak */
  rename: (f: 'pelanggan' | 'tambang', from: string, to: string) => emit({ ...state, rows: state.rows.map(r => r[f] === from ? { ...r, [f]: to } : r), custom: true }),
  removeBy: (f: 'pelanggan' | 'tambang', v: string) => emit({ ...state, rows: state.rows.filter(r => r[f] !== v), custom: true }),
  reset: () => emit({ rows: seedRows(), alias: state.alias, custom: false }),
  setAlias: (label: string, to: string) => { const a = { ...state.alias }; if (to) a[label] = to; else delete a[label]; emit({ ...state, alias: a }) },
}
export const useKontrak = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state)
