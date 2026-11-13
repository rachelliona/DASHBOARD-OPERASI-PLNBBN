import { describe, it, expect } from 'vitest'
import { parseEta } from '../domain/monthly'
import { etaDelay, updateEtaHistory } from '../domain/eta'
const D = (m: number, d: number, h = 0) => Date.UTC(2026, m - 1, d, h)
describe('ETA Rakor (kolom Tgl.)', () => {
  const ms = [null, D(10, 11), null, null, null, null, null, null, null, null]
  it('parse hari, dd/mm, bulan saja', () => { expect(parseEta('13', 'Oktober', ms)).toBe(D(10, 13)); expect(parseEta('13-14', 'Oktober', ms)).toBe(D(10, 13)); expect(parseEta('25/10', 'Carry Over', ms)).toBe(D(10, 25)); expect(parseEta('Nov', 'Oktober', ms)).toBeNull(); expect(parseEta('', 'Oktober', ms)).toBeNull(); expect(parseEta('13', 'Carry Over', ms)).toBeNull(); expect(parseEta('31', 'November', ms)).toBeNull() })
  it('tahun mengikuti milestone', () => { expect(parseEta('25', 'Desember', [null, Date.UTC(2025, 11, 20)])).toBe(Date.UTC(2025, 11, 25)); expect(parseEta('5', 'Januari', [null, Date.UTC(2025, 11, 28)])).toBe(Date.UTC(2026, 0, 5)) })
  it('selisih ETA vs aktual', () => {
    const base = { eta: D(10, 13), stage: 'sailing' as string | null }; const tiba = (x: number) => [null, null, null, null, null, null, x, null, null, null]
    expect(etaDelay({ ...base, ms: tiba(D(10, 15, 9)) }, 6, D(10, 20))).toEqual({ kind: 'aktual', days: 2 }); expect(etaDelay({ ...base, ms: tiba(D(10, 12, 23)) }, 6, D(10, 20))).toEqual({ kind: 'aktual', days: -1 })
    expect(etaDelay({ ...base, ms: tiba(0) }, 6, D(10, 20))).toMatchObject({ kind: 'aktual' })
    const none = [null, null, null, null, null, null, null, null, null, null]
    expect(etaDelay({ ...base, ms: none }, 6, D(10, 20))).toEqual({ kind: 'lewat-eta', days: 7 }); expect(etaDelay({ ...base, ms: none }, 6, D(10, 12))).toEqual({ kind: 'belum', days: null })
    expect(etaDelay({ eta: D(10, 13), stage: 'bongkar', ms: none }, 6, D(10, 20))).toEqual({ kind: 'tanpa-aktual', days: null }); expect(etaDelay({ eta: null, stage: null, ms: none }, 6, D(10, 20)).kind).toBe('tanpa-eta')
  })
  it('riwayat ETA hanya bertambah saat berubah', () => {
    const h = {}; const s = (eta: number | null, si = '1') => [{ id: 'a', si, eta }, { id: 'b', si: '', eta: D(10, 1) }]
    updateEtaHistory(h, s(D(10, 13)), '2026-10-28'); updateEtaHistory(h, s(D(10, 13)), '2026-10-29'); updateEtaHistory(h, s(D(10, 16)), '2026-10-30'); updateEtaHistory(h, s(D(10, 17)), '2026-10-30')
    expect(h).toEqual({ a: [['2026-10-28', '2026-10-13'], ['2026-10-30', '2026-10-17']] })
  })
})
