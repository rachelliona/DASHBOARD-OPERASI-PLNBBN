// Arsip PDF SI unggahan (hanya Racel): salinan di browser (IndexedDB) + salinan di Google Drive Racel (via Apps Script).
const DB = 'pln-si-berkas', ST = 'pdf'
const buka = () => new Promise<IDBDatabase>((ok, no) => { const q = indexedDB.open(DB, 1); q.onupgradeneeded = () => q.result.createObjectStore(ST); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error) })
export async function simpanLokal(id: string, blob: Blob) { try { const d = await buka(); await new Promise<void>((ok, no) => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(blob, id); t.oncomplete = () => ok(); t.onerror = () => no(t.error) }) } catch { /* abaikan */ } }
export async function ambilLokal(id: string): Promise<Blob | null> { try { const d = await buka(); return await new Promise(ok => { const q = d.transaction(ST).objectStore(ST).get(id); q.onsuccess = () => ok((q.result as Blob) ?? null); q.onerror = () => ok(null) }) } catch { return null } }
export const b64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
/** Buka PDF: salinan lokal bila ada, kalau tidak tautan Drive (hanya bisa dibuka akun Google Racel). */
export async function bukaBerkas(id: string, url?: string) { const b = await ambilLokal(id); if (b) { window.open(URL.createObjectURL(b), '_blank'); return true } if (url) { window.open(url, '_blank', 'noopener'); return true } return false }
