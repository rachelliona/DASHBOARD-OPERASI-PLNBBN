import { describe, it, expect } from 'vitest'
import { sumberText, fmtUpdate, tone } from '../domain/view'
describe('tampilan', () => {
  it('format tanggal update seperti PDF', () => expect(fmtUpdate('22 Oktober 2026 pukul 15.23 WIB')).toBe('22 OKTOBER 2026, 15.23 WIB'))
  it('teks sumber tambang', () => {
    expect(sumberText([{ mitra: 'BIB', moda: '300 ft', volume: 7500 }, { mitra: 'BIB', moda: '300 ft', volume: 7600 }, { mitra: 'ATM', moda: 'Vessel', volume: 33000 }])).toBe('BIB (2 tongkang 300ft; 15,1rb MT), ATM (1 vessel; 33rb MT)')
  })
  it('warna pemenuhan', () => { expect(tone(90)).toBe('#34d399'); expect(tone(70)).toBe('#fbbf24'); expect(tone(10)).toBe('#fb7185'); expect(tone(null)).toBe('#6b7280') })
})
