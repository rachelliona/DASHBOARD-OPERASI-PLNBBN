import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { parseKontrakSheet, pelangganPendek } from '../domain/kontrakSheet'
describe('sheet database kontrak', () => {
  const rows = parseKontrakSheet(fs.readFileSync(__dirname + '/fixtures-kontrak-2026.csv', 'utf8'))
  it('membaca kontrak pelanggan 2026', () => {
    expect(rows.length).toBeGreaterThan(50)
    const bib = rows.find(r => r.tambang === 'PT Borneo Indobara' && r.pelanggan === 'PLN/PNP')!; expect(bib.vol).toBe(11608000); expect(bib.gar).toBe(4100); expect(bib.cluster).toBe('LRC'); expect(bib.status).toBe(0)
    const td = rows.find(r => r.tambang === 'PT Tambang Damai')!; expect(td.pelanggan).toBe('PLN Group'); expect(td.gar).toBe(6300); expect(td.cluster).toBe('HRC')
    expect(rows.some(r => /kosong/i.test(r.pelanggan))).toBe(false); expect(rows.some(r => r.tambang === 'Bleending')).toBe(false)
  })
  it('nama pendek pelanggan', () => { expect(pelangganPendek('PT Lestari Banten Energi (PLTU LBE)')).toBe('PLTU LBE'); expect(pelangganPendek('PT PLN Batam')).toBe('PLN Batam'); expect(pelangganPendek('PLN/PNP')).toBe('PLN/PNP') })
})
