import { describe, it, expect, vi } from 'vitest'
import { siActions, kosongkanSheet } from '../si/store'
import { kosong } from '../si/types'

describe('hapus SI ikut kosongkan spreadsheet', () => {
  it('arsip sheet bernomor sama tidak menghalangi, baris sheet dikosongkan', async () => {
    const calls: any[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, o: any) => { const b = JSON.parse(o.body); calls.push(b); return { json: async () => ({ ok: true, row: b.row, baris: 9 }) } }))
    siActions.setRemote('https://contoh.test/exec')
    const si = { ...kosong(), id: 'si-a', nomor: 3166, tahun: 2026, tahap: 'terbit', sumber: 'sistem' } as any
    const arsip = { ...kosong(), id: 'sheet-2026-3166', nomor: 3166, tahun: 2026, tahap: 'terbit', sumber: 'sheet-2026' } as any
    await siActions.simpan(si); await siActions.simpan(arsip)
    await siActions.hapus('si-a'); const k = await kosongkanSheet(3166, 2026)
    expect(k.ok).toBe(true)
    expect(calls.some(c => c.action === 'sheetKosong' && c.nomor === 3166)).toBe(true)
    expect(calls.some(c => c.action === 'delete' && c.id === 'sheet-2026-3166')).toBe(true)
    vi.unstubAllGlobals()
  })
  it('ditolak kalau SI dashboard bernomor itu masih ada', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u: string, o: any) => { const b = JSON.parse(o.body); return { json: async () => ({ ok: true, row: b.row }) } }))
    await siActions.simpan({ ...kosong(), id: 'si-b', nomor: 3170, tahun: 2026, tahap: 'terbit', sumber: 'sistem' } as any)
    expect((await kosongkanSheet(3170, 2026)).ok).toBe(false)
    vi.unstubAllGlobals()
  })
})

import { arsipYatim } from '../si/store'
describe('arsip yatim setelah ganti nomor', () => {
  const sis = { ...kosong(), id: 'si-x', nomor: 3166, tahun: 2026, tahap: 'terbit', sumber: 'sistem', pemohon: 'Billy', tambang: 'PT Barasentosa Lestari', mitra: 'PT Barasentosa Lestari', transporter: 'PT Pelayaran Bahtera Adhiguna', skema: 'FOB', laycanMulai: '2026-11-26', laycanSelesai: '2026-11-28', tanggal: '2026-11-25', pltu: 'PLTU Indramayu. Kab. Indramayu', koreksi: [{ at: 'x', oleh: 'Racel (koreksi besar, nomor 3167 → 3166)', ubah: [] }] } as any
  const arsip = { ...kosong(), id: 'sheet-2026-3167', nomor: 3167, tahun: 2026, tahap: 'terbit', sumber: 'sheet-2026', pemohon: 'Billy', tambang: 'BSL', laycanTeks: '26-28', pltu: 'PLTU Indramayu. Kab. Indramayu', bongkar: 'PLTU Indramayu. Kab. Indramayu', transporter: 'BSL & BAG' } as any
  it('dikenali sebagai sisa nomor lama', () => { expect(arsipYatim([sis, arsip]).map(r => r.id)).toEqual(['sheet-2026-3167']) })
  it('tidak menyentuh arsip lain yang isinya mirip tapi nomornya tidak pernah dipindah', () => { expect(arsipYatim([{ ...sis, koreksi: [] }, arsip])).toEqual([]) })
})
