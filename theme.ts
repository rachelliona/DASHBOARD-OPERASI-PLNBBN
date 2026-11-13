import { useSyncExternalStore } from 'react'
export type Theme = 'dark' | 'light'
const K = 'pln-theme'
const read = (): Theme => { try { return localStorage.getItem(K) === 'light' ? 'light' : 'dark' } catch { return 'dark' } }
let cur: Theme = read(); const subs = new Set<() => void>()
export const applyTheme = (t: Theme) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = t; document.documentElement.style.colorScheme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#eef2f8' : '#0a0c10')
}
export const setTheme = (t: Theme) => { cur = t; try { localStorage.setItem(K, t) } catch { /* abaikan */ } applyTheme(t); subs.forEach(f => f()) }
export const useTheme = (): Theme => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => cur, () => 'dark')
applyTheme(cur)
