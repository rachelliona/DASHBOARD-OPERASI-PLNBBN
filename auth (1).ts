import type { Parsed } from './csv'
/** PBKDF2-SHA256, 100.000 iterasi, salt = pln-bbn:<user id huruf kecil>. Hasil 64 karakter heksadesimal. */
export async function hashPassword(userId: string, password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: enc.encode('pln-bbn:' + userId.trim().toLowerCase()) }, key, 256)
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export const isHash = (s: string) => /^[a-f0-9]{64}$/i.test(s.trim())
export type Account = { id: string; nama: string; secret: string }
export function readAccounts(p: Parsed): { accounts: Account[]; problem?: string } {
  const find = (re: RegExp) => p.headers.find(h => re.test(h))
  const idH = find(/user\s*id|username/i) ?? find(/^(user|id|email)$/i), pwH = find(/pass|sandi|hash/i), nmH = find(/^nama$|name/i)
  if (!idH || !pwH) return { accounts: [], problem: `Kolom User ID dan Password tidak ditemukan di tabel login. Kolom terbaca: ${p.headers.join(', ')}` }
  return { accounts: p.rows.filter(r => r[idH]?.trim()).map(r => ({ id: r[idH].trim(), nama: (nmH && r[nmH]) || r[idH], secret: (r[pwH] ?? '').trim() })) }
}
/** Kolom Password boleh berisi teks biasa atau hash PBKDF2 (64 heksa). Teks biasa dapat dibaca siapa pun yang memiliki tautan CSV. */
export async function checkLogin(accounts: Account[], userId: string, password: string) {
  const a = accounts.find(x => x.id.toLowerCase() === userId.trim().toLowerCase())
  if (!a || !password) return { ok: false as const, reason: 'salah' as const }
  const match = isHash(a.secret) ? (await hashPassword(a.id, password)) === a.secret.toLowerCase() : password === a.secret
  return match ? { ok: true as const, user: { id: a.id, nama: a.nama } } : { ok: false as const, reason: 'salah' as const }
}
