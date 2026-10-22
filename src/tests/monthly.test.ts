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
