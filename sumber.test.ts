import { describe, it, expect } from 'vitest'
import { fitSumber } from '../report/deck'
import { compactSumber } from '../domain/view'
const LONG = 'BIB (6 tongkang 300ft; 45,1rb MT), KPC (3 tongkang 270ft/300ft; 22,0rb MT), ADARO (2 vessel; 80,5rb MT), MIP (4 tongkang 330ft; 30,2rb MT)'
describe('sumber tambang', () => {
  it('tingkat penyingkatan membuang ft dan MT', () => { const c = compactSumber(LONG, 2); expect(c).not.toMatch(/ft|MT/); expect(c).toContain('BIB') })
  it('level 3 hanya nama dan jumlah', () => { expect(compactSumber('BIB (6 tongkang 300ft; 45,1rb MT)', 3)).toBe('BIB (6; 45,1rb)') })
  it('selalu menyisakan semua nama sumber tanpa elipsis bila bisa 2 baris', () => { const f = fitSumber(LONG, 9.5, 303, 26); for (const n of ['BIB', 'KPC', 'ADARO', 'MIP']) expect(f.s).toContain(n); expect(f.s.split('\n').length).toBeLessThanOrEqual(2) })
  it('teks pendek tidak diubah', () => { expect(fitSumber('BIB (2 tongkang; 10rb MT)', 9.5, 303, 26).s).toBe('BIB (2 tongkang; 10rb MT)') })
})
