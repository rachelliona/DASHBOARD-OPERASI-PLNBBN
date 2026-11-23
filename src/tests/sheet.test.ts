import { describe, it, expect } from 'vitest'
import { rentangSheet, nilaiSheet, muatSheet, singkatTransport } from '../si/sheet'
import { kosong } from '../si/types'
describe('format baris spreadsheet', () => {
  it('laycan/ETA', () => { expect(rentangSheet('2026-11-25', '2026-11-27', '2026-11-20')).toBe('25-27'); expect(rentangSheet('2026-12-05', '2026-12-06', '2026-11-20', true)).toBe('05-06/12'); expect(rentangSheet('2026-11-30', '2026-12-02', '2026-11-20')).toBe('30/11-02/12') })
  it('nilai', () => {
    const s = { ...kosong(), nomor: 3116, tanggal: '2026-11-20', pemohon: 'billy', mitra: 'PT Barasentosa Lestari', tambang: 'PT Barasentosa Lestari', transporter: 'PT Pelayaran Bahtera Adhiguna', skema: 'FOB' as const, muat: 'Tanah Merah Coal Terminal, Kalimantan Timur', pltu: 'Indramayu', laycanMulai: '2026-11-25', laycanSelesai: '2026-11-27', etaMulai: '2026-12-05', etaSelesai: '2026-12-06' }
    const n = nilaiSheet(s, [['Tanah Merah Coal Terminal', 'Kalimantan Timur', 'Kaltim']])
    expect(n).toMatchObject({ tanggal: '20/11/2026', pemohon: 'Billy', tambang: 'BSL', muat: 'Kaltim', laycan: '25-27', eta: '05-06/12', bongkar: 'PLTU Indramayu', kepada: 'BSL & BAG' })
  })
  it('helper', () => { expect(singkatTransport('PT Pelayaran Bahtera Adhiguna')).toBe('BAG'); expect(muatSheet('X', [])).toBe('X') })
})

import { bongkarSheet } from '../si/sheet'
describe('bongkarSheet', () => {
  it('pakai kata PLTU, tanpa DUKS & provinsi', () => {
    expect(bongkarSheet('DUKS PLTU Jeneponto, Sulawesi Selatan')).toBe('PLTU Jeneponto')
    expect(bongkarSheet('Celukan Bawang')).toBe('PLTU Celukan Bawang')
    expect(bongkarSheet('PLTU Tj. Awar-awar')).toBe('PLTU Tj. Awar-awar')
  })
})
