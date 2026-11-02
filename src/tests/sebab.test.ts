import { describe, it, expect } from 'vitest'
import { stepDays } from '../domain/monthly'
import { analisis, noteTags, parseAiJson, stepStats } from '../domain/sebab'
const D = (d: number, h = 0) => Date.UTC(2026, 9, d, h)
const mk = (gaps: number[]) => { const ms: (number | null)[] = [D(1)]; let t = D(1); for (const g of gaps) { t += g * 864e5; ms.push(t) } while (ms.length < 10) ms.push(null); return ms }
describe('analisis keterlambatan', () => {
  const base = Array.from({ length: 7 }, () => ({ ms: mk([1, 1, 1, 1, 1, 3, 1, 1, 1]) })); const stats = stepStats(base, stepDays)
  it('tahap yang melebihi median ≥1 hari menjadi tahap utama', () => {
    const ms = mk([1, 1, 1, 1, 1, 7, 1, 1, 1]); const a = analisis(ms, stepDays(ms), stats, '', D(20), 4)
    expect(a.utama).toBe(5); expect(a.slow[0].over).toBeCloseTo(4); expect(a.teks).toContain('Terlambat 4 hari'); expect(a.teks).toContain('Pelayaran')
  })
  it('tahap berjalan melebihi P75 ditandai', () => {
    const ms = mk([1, 1, 1, 1, 1, 3]); const a = analisis(ms, stepDays(ms), stats, '', D(1) + 0 + 10 * 864e5 + 8 * 864e5, 2)
    expect(a.running?.i).toBe(6)
  })
  it('tanpa bukti kuat memberi pesan netral, bukan karangan', () => {
    const ms = mk([1, 1, 1, 1, 1, 3, 1, 1, 1]); const a = analisis(ms, stepDays(ms), stats, '', D(20), 1)
    expect(a.utama).toBeNull(); expect(a.teks).toContain('Tidak ada tahap yang menonjol')
  })
  it('tag dari catatan', () => { expect(noteTags('Cuaca buruk, antri sandar; dialihkan ke PLTU lain')).toEqual(expect.arrayContaining(['Cuaca', 'Antrean', 'Dialihkan / rekonfirmasi'])); expect(noteTags('')).toEqual([]) })
  it('parseAiJson toleran pagar kode dan membuang entri rusak', () => {
    const r = parseAiJson('Berikut:\n```json\n{"hasil":[{"id":"a","t":" Antrean bongkar ","k":"sedang"},{"id":"b"},{"id":"c","t":"x","k":"aneh"}]}\n```')
    expect(r).toEqual([{ id: 'a', t: 'Antrean bongkar', k: 'sedang' }, { id: 'c', t: 'x', k: 'rendah' }]); expect(parseAiJson('bukan json')).toEqual([])
  })
})
