import { describe, expect, it } from 'vitest'
import { predict, stepStatsFor, totals, probWithin, DAY } from '../domain/simulasi'
const D = (m: number, d: number) => Date.UTC(2026, m - 1, d)
const mk = (plant: string, jetty: string, off = 0): any => { const b = D(1, 1) + off * DAY; const st = [0, 2, 1, 0.5, 3, 1, 4, 1, 0.5, 2]; let t = b; const ms = st.map((x, i) => (t += (i === 0 ? 0 : st[i]) * DAY)); return { id: plant + jetty + off, plant, jetty, sumber: 'TambangA', ms, moda: '', tbbg: '' } }
const hist = Array.from({ length: 12 }, (_, i) => mk('Paiton', 'JettyX', i))
describe('simulasi ETA', () => {
  it('statistik memakai cakupan rute bila sampel cukup', () => { const s = stepStatsFor(hist, { plant: 'Paiton', jetty: 'JettyX' }); expect(s[5].scope).toBe('rute jetty → PLTU'); expect(s[5].med).toBe(4) })
  it('jatuh ke cakupan lebih umum bila rute tak punya data', () => { const s = stepStatsFor(hist, { plant: 'Paiton', jetty: 'Lain' }); expect(s[5].scope).toBe('PLTU tujuan') })
  it('prediksi dari milestone terakhir yang diketahui', () => {
    const st = stepStatsFor(hist, { plant: 'Paiton', jetty: 'JettyX' }); const known: (number | null)[] = Array(10).fill(null); known[1] = D(11, 10)
    const p = predict(known, st, Array(9).fill(0), D(11, 10)); expect(p[2].date).toBe(D(11, 10) + 1 * DAY); expect(p[6].date).toBe(D(11, 10) + (1 + 0.5 + 3 + 1 + 4) * DAY - 0 * DAY - 0)
  })
  it('skenario menambah hari dan bergeser', () => {
    const st = stepStatsFor(hist, { plant: 'Paiton' }); const known: (number | null)[] = Array(10).fill(null); known[1] = D(11, 10); const adj = Array(9).fill(0); adj[5] = 3
    const a = predict(known, st, Array(9).fill(0), D(11, 10)), b = predict(known, st, adj, D(11, 10)); expect((b[6].date as number) - (a[6].date as number)).toBe(3 * DAY)
  })
  it('tahap yang sudah melewati kebiasaan ditandai tertahan', () => {
    const st = stepStatsFor(hist, { plant: 'Paiton' }); const known: (number | null)[] = Array(10).fill(null); known[1] = D(11, 1)
    expect(predict(known, st, Array(9).fill(0), D(11, 9))[2].tertahan).toBe(true)
  })
  it('peluang empiris', () => { const t = totals(hist, { plant: 'Paiton' }, 1, 6); expect(t.vals.length).toBe(12); expect(probWithin(t.vals, 100)).toBe(1); expect(probWithin(t.vals, 0)).toBe(0) })
})
describe('perhitungan mundur & pengisian celah', () => {
  const st = stepStatsFor(hist, { plant: 'Paiton', jetty: 'JettyX' })
  it('SI dihitung mundur dari TA POL', () => { const k: (number | null)[] = Array(10).fill(null); k[1] = D(11, 10); const p = predict(k, st, Array(9).fill(0), D(11, 1)); expect(p[0].date).toBe(D(11, 10) - 2 * DAY); expect(p[0].dir).toBe('mundur'); expect(p[0].lo as number).toBeLessThanOrEqual(p[0].date as number); expect(p[0].hi as number).toBeGreaterThanOrEqual(p[0].date as number) })
  it('celah di antara dua tanggal terisi otomatis', () => { const k: (number | null)[] = Array(10).fill(null); k[1] = D(11, 10); k[4] = D(11, 15); const p = predict(k, st, Array(9).fill(0), D(11, 1)); expect(p[2].dir).toBe('isi'); expect(p[2].date as number).toBeGreaterThan(D(11, 10)); expect(p[3].date as number).toBeLessThan(D(11, 15)) })
})
