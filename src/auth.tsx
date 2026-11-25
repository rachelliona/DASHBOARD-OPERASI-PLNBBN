import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { cachedSheet, freshSheet } from './domain/sheetCache'
import { SOURCES } from './config/sources'
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
import { AUTH_CSV_URL } from './config/auth'
import { parseCsv } from './domain/csv'
import { Account, checkLogin, readAccounts } from './domain/auth'
type User = { id: string; nama: string }
type A = { user: User | null; login: (id: string, pw: string) => Promise<string | null>; logout: () => void }
const Ctx = createContext<A>(null as any)
export const useAuth = () => useContext(Ctx)
const withTimeout = <T,>(p: Promise<T>, ms = 20000) => Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error('timeout')), ms))])
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(sessionStorage.getItem('pln-user') ?? 'null') } catch { return null } })
  const fails = useRef({ n: 0, until: 0 })
  /* saat halaman login terbuka: ambil tabel akun + sheet bulan berjalan di latar belakang, supaya Masuk dan Ringkasan langsung cepat */
  useEffect(() => { if (user) return; freshSheet('AKUN', AUTH_CSV_URL, 60000).catch(() => {}); const b = BLN[new Date(Date.now() + 7 * 36e5).getUTCMonth()], src = SOURCES.find(x => x.name === b); if (src) freshSheet(b, src.url, 60000).catch(() => {}) }, [user])
  const login = async (id: string, pw: string) => {
    if (Date.now() < fails.current.until) return `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((fails.current.until - Date.now()) / 1000)} detik.`
    /* Tabel akun diambil lebih dulu saat halaman login terbuka (prefetch) dan disimpan; cek pakai salinan itu, ambil ulang hanya bila gagal cocok. */
    const baca = (t: string) => { const rd = readAccounts(parseCsv(t)); if (rd.problem) throw new Error(rd.problem); return rd.accounts }
    let accounts: Account[] = []; let segar = false
    try { const c = await cachedSheet('AKUN'); if (c && Date.now() - c.at < 10 * 60e3) accounts = baca(c.t); else { accounts = baca((await withTimeout(freshSheet('AKUN', AUTH_CSV_URL, 60000))).t); segar = true } }
    catch (e: any) { if (e?.message?.startsWith('Kolom')) return e.message; return 'Gagal Mengambil Data tabel login. Periksa koneksi, lalu coba lagi.' }
    let res = await checkLogin(accounts, id, pw)
    if (!res.ok && !segar) { try { accounts = baca((await withTimeout(freshSheet('AKUN', AUTH_CSV_URL, 0))).t); res = await checkLogin(accounts, id, pw) } catch { /* pakai hasil sebelumnya */ } }
    if (res.ok) { fails.current = { n: 0, until: 0 }; sessionStorage.setItem('pln-user', JSON.stringify(res.user)); setUser(res.user); return null }
    if (++fails.current.n >= 5) fails.current = { n: 0, until: Date.now() + 30000 }
    return 'User ID atau password salah.'
  }
  return <Ctx.Provider value={{ user, login, logout: () => { sessionStorage.removeItem('pln-user'); setUser(null) } }}>{children}</Ctx.Provider>
}
