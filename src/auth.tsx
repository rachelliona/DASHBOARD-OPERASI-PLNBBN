import { createContext, useContext, useRef, useState, ReactNode } from 'react'
import { AUTH_CSV_URL } from './config/auth'
import { parseCsv } from './domain/csv'
import { Account, checkLogin, readAccounts } from './domain/auth'
type User = { id: string; nama: string }
type A = { user: User | null; login: (id: string, pw: string) => Promise<string | null>; logout: () => void }
const Ctx = createContext<A>(null as any)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(sessionStorage.getItem('pln-user') ?? 'null') } catch { return null } })
  const fails = useRef({ n: 0, until: 0 })
  const login = async (id: string, pw: string) => {
    if (Date.now() < fails.current.until) return `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((fails.current.until - Date.now()) / 1000)} detik.`
    let accounts: Account[]
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000)
      const r = await fetch(AUTH_CSV_URL, { signal: c.signal, cache: 'no-store' }); clearTimeout(t)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const rd = readAccounts(parseCsv(await r.text())); if (rd.problem) return rd.problem; accounts = rd.accounts
    } catch { return 'Gagal Mengambil Data tabel login. Periksa koneksi, lalu coba lagi.' }
    const res = await checkLogin(accounts, id, pw)
    if (res.ok) { fails.current = { n: 0, until: 0 }; sessionStorage.setItem('pln-user', JSON.stringify(res.user)); setUser(res.user); return null }
    if (++fails.current.n >= 5) fails.current = { n: 0, until: Date.now() + 30000 }
    return 'User ID atau password salah.'
  }
  return <Ctx.Provider value={{ user, login, logout: () => { sessionStorage.removeItem('pln-user'); setUser(null) } }}>{children}</Ctx.Provider>
}
