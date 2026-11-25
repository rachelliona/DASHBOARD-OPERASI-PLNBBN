/** Cache teks sheet: memori + IndexedDB (tampil instan dari salinan terakhir, lalu diperbarui di latar belakang). Fetch yang sama digabung. */
type Ent = { t: string; at: number }
const mem = new Map<string, Ent>(); const fly = new Map<string, Promise<Ent>>()
let dbp: Promise<IDBDatabase | null> | null = null
const db = () => (dbp ??= new Promise(res => { try { const r = indexedDB.open('pln-sheet-cache', 1); r.onupgradeneeded = () => r.result.createObjectStore('txt'); r.onsuccess = () => res(r.result); r.onerror = () => res(null) } catch { res(null) } }))
async function idbGet(k: string): Promise<Ent | null> { const d = await db(); if (!d) return null; return new Promise(res => { try { const q = d.transaction('txt').objectStore('txt').get(k); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null) } catch { res(null) } }) }
async function idbPut(k: string, v: Ent) { const d = await db(); if (!d) return; try { d.transaction('txt', 'readwrite').objectStore('txt').put(v, k) } catch { /* abaikan */ } }
export function putSheet(k: string, t: string) { const e = { t, at: Date.now() }; mem.set(k, e); idbPut(k, e) }
/** Salinan terakhir (memori lalu IndexedDB), atau null. */
export async function cachedSheet(k: string): Promise<Ent | null> { return mem.get(k) ?? (await idbGet(k).then(e => { if (e) mem.set(k, e); return e })) }
/** Ambil versi terbaru dari jaringan (digabung bila sedang berjalan). maxAgeMs: pakai memori bila masih segar. */
export function freshSheet(k: string, url: string, maxAgeMs = 0): Promise<Ent> {
  const m = mem.get(k); if (m && maxAgeMs && Date.now() - m.at < maxAgeMs) return Promise.resolve(m)
  const f = fly.get(k); if (f) return f
  const p = fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() }).then(t => { putSheet(k, t); return mem.get(k)! }).finally(() => fly.delete(k))
  fly.set(k, p); return p
}
