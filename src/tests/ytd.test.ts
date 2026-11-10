import { it, expect } from 'vitest'
import { ytdFromSheet, ytdFromGrid, csvGrid } from '../domain/view'
it('membaca total complete 2026 dari sheet DASHBOARD', () => {
  const h = ['Carry Over NOVEMBER (MT)', 'Konfirmasi Pasokan NOVEMBER (MT)', 'Complete Loading NOVEMBER (MT)', 'Complete Unloading NOVEMBER (MT)', 'TOTAL COMPLETE LOADING 2026 (MT)', 'TOTAL COMPLETE UNLOADING 2026 (MT)']
  const rows = [{ a: '71.000', b: '1.874.000', c: '621.011', d: '32%', e: '137.962', f: '7%', g: '13.284.352', h: '89%', i: '12.784.065', j: '86%' }, { a: '483.048' }]
  expect(ytdFromSheet(h, rows)).toEqual({ bl: 13284352, blPct: 89, ds: 12784065, dsPct: 86 })
  expect(ytdFromSheet(['x'], [{ a: '1' }])).toBeNull()
})

it('membaca dari CSV mentah tanpa memotong kolom', () => { const t = 'TOTAL COMPLETE LOADING 2026 (MT),TOTAL COMPLETE UNLOADING 2026 (MT)\n71.000,"1.874.000",621.011,32%,137.962,7%,13.284.352,89%,12.784.065,86%'; expect(ytdFromGrid(csvGrid(t))).toEqual({ bl: 13284352, blPct: 89, ds: 12784065, dsPct: 86 }) })
