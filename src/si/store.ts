import { useSyncExternalStore } from 'react'
import { Blok, SI, kosong } from './types'
import { nomorBerikut, nomorDipakai, iso, bandingkan, cekKoreksi, FIELDS } from './logic'
const K = 'pln-si-v1', KB = 'pln-si-blok-v1', KU = 'pln-si-remote-v1'
type State = { rows: SI[]; blok: Blok[]; remote: string; sync: '' | 'ok' | 'gagal' | 'proses'; at: string; err: string }
const rd = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d } catch { return d } }
let state: State = { rows: rd<SI[]>(K, []), blok: rd<Blok[]>(KB, []), remote: rd<string>(KU, ''), sync: '', at: '', err: '' }
const subs = new Set<() => void>()
const emit = (n: Partial<State>) => { state = { ...state, ...n }; try { localStorage.setItem(K, JSON.stringify(state.rows)); localStorage.setItem(KB, JSON.stringify(state.blok)); localStorage.setItem(KU, JSON.stringify(state.remote)) } catch { /* tanpa penyimpanan */ } subs.forEach(f => f()) }
export const useSI = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state)
export const newId = () => 'si-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const now = () => new Date().toISOString()
/** Panggilan ke Apps Script (text/plain agar tanpa preflight CORS). */
async function call(body: any) { const r = await fetch(state.remote, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Ditolak server'); return j }
export const siActions = {
  setRemote: (u: string) => emit({ remote: u.trim(), sync: '', err: '' }),
  /** Tarik seluruh registri dari server bersama (menggantikan salinan lokal). */
  async tarik() { if (!state.remote) return; emit({ sync: 'proses', err: '' }); try { const r = await fetch(state.remote + (state.remote.includes('?') ? '&' : '?') + 'action=list'); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'gagal'); emit({ rows: j.rows as SI[], blok: j.blok as Blok[], sync: 'ok', at: now(), err: '' }) } catch (e: any) { emit({ sync: 'gagal', err: String(e?.message || e) }) } },
  setAll: (rows: SI[], blok?: Blok[]) => emit({ rows, ...(blok ? { blok } : {}) }),
  /** Impor massal ke server (hanya admin) lalu simpan lokal. */
  async dorong(rows: SI[]) { if (state.remote) { emit({ sync: 'proses' }); try { await call({ action: 'import', rows, blok: state.blok }); emit({ sync: 'ok', at: now() }) } catch (e: any) { emit({ sync: 'gagal', err: String(e?.message || e) }); throw e } } },
  /** Simpan pengajuan (belum bernomor). */
  async ajukan(d: Partial<SI>, oleh: string): Promise<SI> { const s: SI = { ...kosong(), ...d, id: newId(), tahap: 'pengajuan', nomor: null, dibuat: now(), dibuatOleh: oleh, diubah: now() }; await siActions.simpan(s); return s },
  async simpan(s: SI) { const n = { ...s, diubah: now() }; if (state.remote) { emit({ sync: 'proses' }); try { const j = await call({ action: 'save', row: n }); n.nomor = j.row?.nomor ?? n.nomor; emit({ sync: 'ok', at: now(), err: '' }) } catch (e: any) { emit({ sync: 'gagal', err: String(e?.message || e) }); throw e } } emit({ rows: state.rows.some(r => r.id === n.id) ? state.rows.map(r => r.id === n.id ? n : r) : [...state.rows, n] }) },
  /** Terbitkan: pesan nomor berikutnya secara atomik. Mode server: nomor ditentukan server (LockService). Mode lokal: dari registri di browser ini. */
  async terbitkan(s: SI, opsi: { nomor?: number; tanggal?: string } = {}): Promise<SI> {
    const tahun = +(opsi.tanggal || s.tanggal || iso(new Date())).slice(0, 4); const tanggal = opsi.tanggal || s.tanggal || iso(new Date())
    if (state.remote) {
      emit({ sync: 'proses' }); try { const j = await call({ action: 'reserve', tahun, nomor: opsi.nomor ?? null, row: { ...s, tahun, tanggal, tahap: 'terbit' } }); const n: SI = j.row; emit({ rows: state.rows.some(r => r.id === n.id) ? state.rows.map(r => r.id === n.id ? n : r) : [...state.rows, n], sync: 'ok', at: now(), err: '' }); return n } catch (e: any) { emit({ sync: 'gagal', err: String(e?.message || e) }); throw e }
    }
    const nomor = opsi.nomor ?? nomorBerikut(state.rows, state.blok, tahun); const pakai = nomorDipakai(state.rows, state.blok, tahun, nomor, s.id); if (pakai) throw new Error(`Nomor ${nomor}/${tahun} sudah dipakai${pakai.id === 'blok' ? ' (diblok untuk surat lain)' : ''}.`)
    const n: SI = { ...s, tahun, tanggal, nomor, tahap: 'terbit', diubah: now() }; emit({ rows: state.rows.some(r => r.id === n.id) ? state.rows.map(r => r.id === n.id ? n : r) : [...state.rows, n] }); return n
  },
  /** REVISI: SI baru bernomor baru, menaut ke SI sebelumnya; perubahan dihitung otomatis. Wajib ada perubahan penting & alasan. */
  async revisi(lama: SI, baru: SI, oleh: string): Promise<SI> {
    const perubahan = bandingkan(lama, baru).filter(u => u.f !== 'tanggal'); if (!perubahan.some(u => FIELDS.find(f => f.f === u.f)?.penting)) throw new Error('Tidak ada perubahan penting. Kalau hanya salah ketik, pakai "Koreksi penulisan" (nomor tetap).')
    if (!baru.alasan) throw new Error('Pilih alasan revisi.')
    const n: SI = { ...baru, id: newId(), tahap: 'pengajuan', nomor: null, revisiKe: lama.revisiKe + 1, sebelumnyaId: lama.id, sebelumnyaNomor: lama.nomor, perubahan, koreksi: [], ttd: false, sumber: 'sistem', dibuat: now(), dibuatOleh: oleh, tanggal: iso(new Date()) }
    return siActions.terbitkan(n)
  },
  /** KOREKSI PENULISAN: nomor tetap, bukan revisi. Ditolak bila field penting berubah lebih dari sekadar typo. */
  async koreksi(lama: SI, baru: SI, oleh: string): Promise<SI> {
    const c = cekKoreksi(lama, baru); if (!c.ubah.length) throw new Error('Tidak ada yang diubah.')
    if (!c.ok) throw new Error('Perubahan ini bukan typo (' + c.tolak.map(t => t.label).join(', ') + '). Gunakan "Revisi SI" supaya dapat nomor baru.')
    const n: SI = { ...baru, id: lama.id, nomor: lama.nomor, tahun: lama.tahun, tahap: lama.tahap, revisiKe: lama.revisiKe, sebelumnyaId: lama.sebelumnyaId, sebelumnyaNomor: lama.sebelumnyaNomor, koreksi: [...lama.koreksi, { at: now(), oleh, ubah: c.ubah }] }
    await siActions.simpan(n); return n
  },
  async blokir(tahun: number, nomor: number, ket: string) { if (state.remote) await call({ action: 'block', tahun, nomor, ket }); emit({ blok: [...state.blok.filter(b => !(b.tahun === tahun && b.nomor === nomor)), { tahun, nomor, ket }] }) },
  async lepasBlok(tahun: number, nomor: number) { if (state.remote) await call({ action: 'unblock', tahun, nomor }); emit({ blok: state.blok.filter(b => !(b.tahun === tahun && b.nomor === nomor)) }) },
  async hapusPengajuan(id: string) { if (state.remote) await call({ action: 'delete', id }); emit({ rows: state.rows.filter(r => r.id !== id || r.tahap !== 'pengajuan') }) },
  reset: () => emit({ rows: [], blok: [] }),
}
