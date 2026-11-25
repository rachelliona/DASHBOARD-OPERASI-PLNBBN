import { useSyncExternalStore } from 'react'
import { Kontrak, newId, seedRows, clusterOf } from './domain/kontrak'
import { KONTRAK_CSV_URL, parseKontrakSheet } from './domain/kontrakSheet'
import { cachedSheet, freshSheet } from './domain/sheetCache'
const KEY = 'pln-kontrak-v1', AKEY = 'pln-kontrak-alias-v1'
type State = { rows: Kontrak[]; alias: Record<string, string>; custom: boolean; sumber?: 'sheet' | 'lokal' | 'bawaan'; at?: number; err?: string; memuat?: boolean }
function load(): State {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); const a = JSON.parse(localStorage.getItem(AKEY) || '{}'); if (Array.isArray(r) && r.length) return { rows: r, alias: a && typeof a === 'object' ? a : {}, custom: true } } catch { /* tanpa penyimpanan */ }
  try { const a = JSON.parse(localStorage.getItem(AKEY) || '{}'); return { rows: seedRows(), alias: a && typeof a === 'object' ? a : {}, custom: false } } catch { return { rows: seedRows(), alias: {}, custom: false } }
}
let state: State = load(); const subs = new Set<() => void>()
const emit = (next: State) => { state = next; try { localStorage.setItem(KEY, JSON.stringify(next.rows)); localStorage.setItem(AKEY, JSON.stringify(next.alias)) } catch { /* abaikan */ } subs.forEach(f => f()) }
const fix = (r: Kontrak): Kontrak => ({ ...r, gar: Math.max(0, +r.gar || 0), vol: Math.max(0, +r.vol || 0), status: r.status ? 1 : 0 })
export const kontrakActions = {
  set: (rows: Kontrak[]) => emit({ ...state, rows: rows.map(fix), custom: true, sumber: 'lokal' as const }),
  add: (r: Omit<Kontrak, 'id'>) => emit({ ...state, rows: [...state.rows, fix({ ...r, id: newId() })], custom: true, sumber: 'lokal' as const }),
  patch: (id: string, p: Partial<Kontrak>) => emit({ ...state, rows: state.rows.map(r => r.id === id ? fix({ ...r, ...p, ...(p.gar != null && p.cluster == null ? { cluster: clusterOf(+p.gar) } : {}) }) : r), custom: true, sumber: 'lokal' as const }),
  remove: (id: string) => emit({ ...state, rows: state.rows.filter(r => r.id !== id), custom: true, sumber: 'lokal' as const }),
  /** ganti nama master (pelanggan = 'pelanggan', pemasok = 'tambang') di semua kontrak */
  rename: (f: 'pelanggan' | 'tambang', from: string, to: string) => emit({ ...state, rows: state.rows.map(r => r[f] === from ? { ...r, [f]: to } : r), custom: true, sumber: 'lokal' as const }),
  removeBy: (f: 'pelanggan' | 'tambang', v: string) => emit({ ...state, rows: state.rows.filter(r => r[f] !== v), custom: true, sumber: 'lokal' as const }),
  reset: () => { emit({ rows: seedRows(), alias: state.alias, custom: false, sumber: 'bawaan' }); syncKontrak(true) },
  setAlias: (label: string, to: string) => { const a = { ...state.alias }; if (to) a[label] = to; else delete a[label]; emit({ ...state, alias: a }) },
}
/** Ambil daftar kontrak dari Google Sheet Database Kontrak: tampil dulu dari salinan tersimpan, lalu versi terbaru (segar 5 menit). Sheet selalu jadi sumber utama. */
let mulai = false
export async function syncKontrak(paksa = false) {
  const pakai = (t: string, at: number) => { const rows = parseKontrakSheet(t); if (rows.length >= 5) { state = { ...state, rows, custom: false, sumber: 'sheet', at, err: '' }; subs.forEach(f => f()) } }
  state = { ...state, memuat: true }; subs.forEach(f => f())
  try { if (!paksa) { const c = await cachedSheet('KONTRAK'); if (c) pakai(c.t, c.at) }
    const f = await freshSheet('KONTRAK', KONTRAK_CSV_URL, paksa ? 0 : 300000); pakai(f.t, f.at) }
  catch (e: any) { state = { ...state, err: e?.message || String(e) } }
  finally { state = { ...state, memuat: false, sumber: state.sumber ?? (state.custom ? 'lokal' : 'bawaan') }; subs.forEach(f => f()) }
}
export const useKontrak = () => { if (!mulai && typeof window !== 'undefined' && typeof fetch !== 'undefined' && typeof indexedDB !== 'undefined') { mulai = true; setTimeout(() => { syncKontrak() }, 0) } return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state) }
