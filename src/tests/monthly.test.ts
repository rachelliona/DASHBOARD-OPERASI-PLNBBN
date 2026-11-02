import { describe, it, expect } from 'vitest'
import { parseCsv } from '../domain/csv'
import { parseMonthly, aggregatePlants, plantName, regionOf } from '../domain/monthly'
const csv = `MONITORING PASOKAN,,,,,,,,,
PLTU,Wilayah,Konfirmasi,Jumlah,TB/BG,Status,No. SI,Sumber Tambang,B/L,D/S
Adipala (PC) LRC,,,,,,,,,
Adipala (PC) LRC,,Oktober,30.000,MV X,Selesai Muat/Sailing,2572,PT Borneo Indobara,"27.000,000",
Adipala (PC) LRC,,Carry Over,30.000,MV Y,Selesai Bongkar,2180,PT Borneo Indobara,"33.000,000","33.000,026"
Adipala (PC) LRC,,Oktober, ,,,,#N/A,,
Subtotal,,,150.000,,,,,"120.000,000","60.000,069"
Paiton (PJB),,Oktober,7.500,TB A/BG B;x,Sudah Ada Jadwal Muat,2600,,,
`
describe('sheet bulanan', () => {
  const m = parseMonthly(parseCsv(csv), 'Oktober')
  it('lewati judul kelompok, #N/A, Subtotal', () => { expect(m.missing).toEqual([]); expect(m.ships).toHaveLength(3); expect(m.skipped).toBe(2); expect(m.sub.ds).toBeCloseTo(60000.069, 3) })
  it('agregasi per PLTU', () => {
    const a = aggregatePlants(m.ships); const ad = a.find(x => x.pltu === 'Adipala')!; const pa = a.find(x => x.pltu === 'Paiton')!
    expect(ad).toMatchObject({ wilayah: 'JAMALI', target: 30000, carryOver: 30000, sailing: 27000, n: 2 }); expect(ad.unloading).toBeCloseTo(33000.026, 3); expect(pa.terjadwal).toBe(7500)
  })
  it('nama PLTU & wilayah', () => { expect(plantName('Sanggau (Stoker) - Transhipment Pontianak')).toBe('Sanggau'); expect(plantName('Tj Redeb / Berau (Stoker)')).toBe('Tj. Redeb / Berau'); expect(plantName('Paiton (PJB)')).toBe('Paiton'); expect(regionOf('Kupang')).toBe('Sulmapana 2') })
  it('kolom hilang dilaporkan', () => { expect(parseMonthly({ headers: ['PLTU'], rows: [] }, 'Oktober').missing).toContain('B/L') })
})
import { parseDT, parseSI, stepDays, aggregateYtd, pctl } from '../domain/monthly'
describe('tanggal & tahap', () => {
  it('format tanggal sheet', () => { expect(parseDT('11/12/25 13:15')).toBe(Date.UTC(2025, 11, 11, 13, 15)); expect(parseDT('02/01/2026')).toBe(Date.UTC(2026, 0, 2)); expect(parseDT('25/01/2614:35')).toBe(Date.UTC(2026, 0, 25, 14, 35)); expect(parseDT('31/12/1015')).toBeNull(); expect(parseDT('abc')).toBeNull() })
  it('Tgl. SI tanpa tahun', () => { const ref = Date.UTC(2026, 0, 3); expect(parseSI('28/11', ref)).toBe(Date.UTC(2025, 10, 28)); expect(parseSI('02/01', ref)).toBe(Date.UTC(2026, 0, 2)); expect(parseSI('12/10', null)).toBeNull() })
  it('lama tahap dalam hari; urutan terbalik = null', () => {
    const d = (x: number) => Date.UTC(2026, 0, x); const r = stepDays([d(1), d(2), d(2), d(3), d(3), d(5), d(10), null, null, null])
    expect(r[0]).toBe(1); expect(r[5]).toBe(5); expect(r[6]).toBeNull(); expect(stepDays([d(5), d(2), null, null, null, null, null, null, null, null])[0]).toBeNull()
  })
  it('persentil & rekap tahunan', () => { expect(pctl([1, 2, 3, 4], 0.5)).toBe(2.5); expect(pctl([], 0.5)).toBeNull() })
  it('rekap tahun per PLTU', () => {
    const t = parseCsv('PLTU,Konfirmasi,Jumlah,Status,B/L,D/S\nPaiton (PJB),Januari,7.500,Selesai Bongkar,"7.438,28","7.431,17"\nPaiton (PJB),Februari,7.500,,,\nPLTU,Konfirmasi,Jumlah,Status,B/L,D/S\nTOTAL,,15.000,,,\n')
    const y = aggregateYtd(parseMonthly(t, 'Januari').ships); expect(y).toHaveLength(1); expect(y[0].keb).toBe(15000); expect(y[0].ds).toBeCloseTo(7431.17, 2); expect(y[0].bln[0].j).toBe(7500); expect(y[0].p).toBeCloseTo(49.54, 1)
  })
})
