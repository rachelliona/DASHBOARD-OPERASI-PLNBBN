import { useSyncExternalStore } from 'react'
import { Blok, SI, kosong } from './types'
import { SI_REMOTE_URL } from '../config/sources'
import { dariDatabas, dariSheet, gabung } from './legacy'
import { isCad, nomorBerikut, nomorDipakai, iso, bandingkan, cekKoreksi, FIELDS } from './logic'
const K = 'pln-si-v1', KB = 'pln-si-blok-v1', KU = 'pln-si-remote-v1'
type State = { riwayat: '' | 'memuat' | 'ok' | 'gagal'; rows: SI[]; blok: Blok[]; remote: string; sync: '' | 'ok' | 'gagal' | 'proses'; at: string; err: string }
const rd = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d } catch { return d } }
let state: State = { riwayat: '', rows: rd<SI[]>(K, []), blok: rd<Blok[]>(KB, []), remote: rd<string>(KU, '') || SI_REMOTE_URL, sync: '', at: '', err: '' }
const KH = 'pln-si-hapus-v1'; const hapusan = new Set<string>(rd<string[]>(KH, []))
const subs = new Set<() => void>()
const emit = (n: Partial<State>) => { state = { ...state, ...n }; try { localStorage.setItem(K, JSON.stringify(state.rows)); localStorage.setItem(KB, JSON.stringify(state.blok)); localStorage.setItem(KU, JSON.stringify(state.remote)) } catch { /* tanpa penyimpanan */ } subs.forEach(f => f()) }
export const useSI = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state, () => state)
export const newId = () => 'si-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const now = () => new Date().toISOString()
/** Panggilan ke Apps Script (text/plain agar tanpa preflight CORS). */
async function call(body: any) { const r = await fetch(state.remote, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Ditolak server'); return j }
const BASE = import.meta.env.BASE_URL
let muat: Promise<void> | null = null
let sinkAt = 0
async function bacaLegacy(): Promise<SI[]> {
  const db = await (await fetch(BASE + 'si/databas-si.json')).json(); let sheet: SI[] = []
  try { const src = (await import('../config/sources')) as any; const url = (src.SI_CSV_URL as string) ?? ''; if (url) sheet = dariSheet(await (await fetch(url)).text()) } catch { /* sheet opsional */ }
  return gabung(dariDatabas(db), sheet).filter(r => !hapusan.has(r.id))
}
const KC = 'pln-si-cad-v1'
export const getCad = () => { try { const v = localStorage.getItem(KC); return v == null ? 0 : Math.max(0, Math.min(10, +v || 0)) } catch { return 0 } }
export const setCad = (n: number) => { try { localStorage.setItem(KC, String(Math.max(0, Math.min(10, n)))) } catch { /* abaikan */ } }
export const siActions = {
  /** Muat arsip Databas SI + sheet SI 2026 supaya nomor berikutnya MELANJUTKAN nomor yang sudah ada (tidak mulai dari 0001). Sheet diambil ulang tiap dipanggil. */
  /** Mode server: tarik registri, lalu kirim ke server SI lama (arsip + sheet) yang belum ada di sana, supaya nomor server melanjutkan nomor terakhir. */
  async sinkronLegacy() {
    await siActions.tarik(); if (state.sync === 'gagal') throw new Error(state.err || 'server tidak terjangkau')
    const all = await bacaLegacy(); const have = new Set(state.rows.map(r => r.id)); const baru = all.filter(r => !have.has(r.id))
    for (let i = 0; i < baru.length; i += 800) await call({ action: 'import', rows: baru.slice(i, i + 800), blok: [] })
    if (baru.length) await siActions.tarik()
    if (!state.rows.length) throw new Error('Registri kosong')
    sinkAt = Date.now()
  },
  /** Blokir beberapa nomor sekaligus (satu panggilan ke server). */
  async blokirBanyak(tahun: number, dari: number, jumlah: number, ket: string) { const b: Blok[] = Array.from({ length: jumlah }, (_, i) => ({ tahun, nomor: dari + i, ket })); if (state.remote) await call({ action: 'import', rows: [], blok: b }); emit({ blok: [...state.blok, ...b.filter(x => !state.blok.some(y => y.tahun === x.tahun && y.nomor === x.nomor))] }) },
  muatRiwayat(paksa = false): Promise<void> {
    if (muat && !paksa) return muat
    if (state.remote) { muat = (async () => { emit({ riwayat: 'memuat' }); try { await siActions.sinkronLegacy(); emit({ riwayat: 'ok' }) } catch { emit({ riwayat: 'gagal' }) } })(); return muat } // mode server: nomor ditentukan server
    muat = (async () => { emit({ riwayat: 'memuat' }); try {
      const db = await (await fetch(BASE + 'si/databas-si.json')).json(); let sheet: SI[] = []
      try { const src = (await import('../config/sources')) as any; const url = (src.SI_CSV_URL as string) ?? ''; if (url) sheet = dariSheet(await (await fetch(url)).text()) } catch { /* sheet opsional */ }
      const all = gabung(dariDatabas(db), sheet).filter(r => !hapusan.has(r.id)); const buatan = state.rows.filter(r => r.sumber === 'sistem')
      emit({ rows: [...all, ...buatan], riwayat: 'ok' })
    } catch { emit({ riwayat: state.rows.length ? 'ok' : 'gagal' }) } })()
    return muat
  },
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
    if (state.remote) { if (Date.now() - sinkAt > 300000) await siActions.sinkronLegacy() } else { await siActions.muatRiwayat(true); if (state.riwayat !== 'ok') throw new Error('Riwayat nomor SI belum termuat (sheet SI tidak terjangkau). Coba lagi sebentar supaya nomor tidak mulai dari 0001.') }
    // pakai slot cadangan backdate: lepaskan dulu blok cadangannya
    if (opsi.nomor != null && state.blok.some(b => b.tahun === tahun && b.nomor === opsi.nomor && isCad(b))) await siActions.lepasBlok(tahun, opsi.nomor)
    // hari baru: sisihkan slot cadangan untuk SI backdate hari-hari sebelumnya
    if (opsi.nomor == null && getCad() > 0) {
      const terakhir = state.rows.reduce((m, r) => r.tahun === tahun && r.nomor != null && r.tahap !== 'pengajuan' && r.tanggal > m && r.tanggal <= iso(new Date(Date.now() + 864e5)) ? r.tanggal : m, '')
      if (terakhir && tanggal > terakhir) { const hari = Math.max(1, Math.min(5, Math.round((Date.parse(tanggal) - Date.parse(terakhir)) / 864e5))); const mx = nomorBerikut(state.rows, state.blok, tahun) - 1
        await siActions.blokirBanyak(tahun, mx + 1, getCad() * hari, 'Cadangan backdate (sebelum ' + tanggal + ')') }
    }
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
  /** ADMIN: hapus SI apa pun (termasuk yang sudah terbit). Nomornya jadi slot kosong. */
  /** ADMIN: masukkan SI yang dibuat di luar dashboard (hasil unggah PDF). Baris arsip lama bernomor sama diganti. */
  async unggah(si: SI, pdf?: ArrayBuffer): Promise<{ drive: boolean }> {
    for (const r of state.rows.filter(r => r.tahun === si.tahun && r.nomor === si.nomor && (r.sumber !== 'sistem' || /unggah/.test(r.dibuatOleh)))) await siActions.hapus(r.id)
    let drive = false; const n = { ...si }
    if (pdf) { const { simpanLokal, b64 } = await import('./berkas'); await simpanLokal(n.id, new Blob([pdf], { type: 'application/pdf' }))
      if (state.remote) { try { const j = await call({ action: 'file', name: `SI ${n.nomor}.pdf`, b64: b64(pdf) }); if (j?.url) { n.arsipUrl = j.url; drive = true } } catch { /* Drive belum aktif: salinan lokal tetap ada */ } } }
    await siActions.simpan(n); return { drive } },
  async hapus(id: string) { const r0 = state.rows.find(r => r.id === id); if (r0 && r0.sumber !== 'sistem') { hapusan.add(id); try { localStorage.setItem(KH, JSON.stringify([...hapusan])) } catch { /* abaikan */ } } if (state.remote) await call({ action: 'delete', id, paksa: true }); emit({ rows: state.rows.filter(r => r.id !== id) }) },
  /** ADMIN: kelola SI terbit — ubah isi/nomor/tanggal tanpa revisi. Tercatat di riwayat. */
  async kelola(lama: SI, baru: SI, oleh: string): Promise<SI> {
    const tanggal = baru.tanggal || lama.tanggal; const tahun = +tanggal.slice(0, 4) || lama.tahun; const nomor = baru.nomor ?? lama.nomor
    if (nomor != null) { const p = nomorDipakai(state.rows, state.blok, tahun, nomor, lama.id); if (p) throw new Error(`Nomor ${nomor}/${tahun} sudah dipakai${p.id === 'blok' ? ' (diblok untuk surat lain)' : ''}.`) }
    const ubah = bandingkan(lama, { ...baru, tanggal }); if (nomor !== lama.nomor) ubah.unshift({ f: 'nomor', label: 'Nomor SI', dari: String(lama.nomor ?? '—'), ke: String(nomor ?? '—') })
    if (!ubah.length) throw new Error('Tidak ada yang diubah.')
    const n: SI = { ...baru, id: lama.id, tanggal, tahun, nomor, tahap: lama.tahap, koreksi: [...lama.koreksi, { at: now(), oleh: oleh + ' (admin)', ubah }] }
    await siActions.simpan(n); return n
  },
  reset: () => emit({ rows: [], blok: [] }),
}
