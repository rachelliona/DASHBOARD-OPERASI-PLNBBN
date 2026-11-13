import { it, expect } from 'vitest'
import { ytdFromSheet, ytdFromGrid, csvGrid } from '../domain/view'
it('membaca total complete 2026 dari sheet DASHBOARD', () => {
  const h = ['Carry Over NOVEMBER (MT)', 'Konfirmasi Pasokan NOVEMBER (MT)', 'Complete Loading NOVEMBER (MT)', 'Complete Unloading NOVEMBER (MT)', 'TOTAL COMPLETE LOADING 2026 (MT)', 'TOTAL COMPLETE UNLOADING 2026 (MT)']
  const rows = [{ a: '71.000', b: '1.874.000', c: '621.011', d: '32%', e: '137.962', f: '7%', g: '13.284.352', h: '89%', i: '12.784.065', j: '86%' }, { a: '483.048' }]
  expect(ytdFromSheet(h, rows)).toMatchObject({ bl: 13284352, blPct: 89, ds: 12784065, dsPct: 86 })
  expect(ytdFromSheet(['x'], [{ a: '1' }])).toBeNull()
})

it('membaca dari CSV mentah tanpa memotong kolom', () => { const t = 'TOTAL COMPLETE LOADING 2026 (MT),TOTAL COMPLETE UNLOADING 2026 (MT)\n71.000,"1.874.000",621.011,32%,137.962,7%,13.284.352,89%,12.784.065,86%'; expect(ytdFromGrid(csvGrid(t))).toEqual({ bl: 13284352, blPct: 89, ds: 12784065, dsPct: 86 }) })

import { monthFromGrid } from '../domain/view'
it('blok bulan DASHBOARD: Carry Over, Konfirmasi, Loading, Unloading', () => {
    const csv = ',DASHBOARD MONITORING PASOKAN PT PLN BATUBARA NIAGA TAHUN 2026,NOVEMBER\nSelasa, 10 November 2026\nSudah Ada Jadwal Muat,47,Proses Loading,5\nCarry Over NOVEMBER (MT),Konfirmasi Pasokan NOVEMBER (MT),Complete Loading NOVEMBER (MT),Complete Unloading NOVEMBER (MT),TOTAL COMPLETE LOADING 2026 (MT),TOTAL COMPLETE UNLOADING 2026 (MT)\n71.000,1.874.000,621.011,32%,137.962,7%,13.284.352,89%,12.784.065,86%\n'
    expect(monthFromGrid(csvGrid(csv))).toEqual({ bulan: 'november', carry: 71000, konf: 1874000, bl: 621011, ds: 137962 })
})

import { countsFromGrid } from '../domain/view'
it('jumlah nominasi per status dibaca dari sheet DASHBOARD (format nyata)', () => {
  const csv = ',Sudah Ada Jadwal Muat,,,49,,Proses Loading,,,5,,Selesai Muat / Sailing ke PLTU Tujuan,,,40,,Tiba / Antri di Jetty PLTU,,,17,,Proses Bongkar,,,3,,Selesai Bongkar,,,15'
  expect(countsFromGrid(csvGrid(csv))).toEqual({ terjadwal: 49, loading: 5, sailing: 40, tiba: 17, bongkar: 3, unloading: 15 })
})

import { readFileSync } from 'node:fs'
it('format nyata DASHBOARD (13 Nov 2026): blok bulan, 6 status, dan total 2026 terbaca semua', () => {
  const g = csvGrid(readFileSync(new URL('./fixtures/dashboard-2026-11-13.csv', import.meta.url), 'utf8'))
  expect(monthFromGrid(g)).toEqual({ bulan: 'november', carry: 71000, konf: 1881500, bl: 679026, ds: 150429 })
  expect(countsFromGrid(g)).toEqual({ terjadwal: 49, loading: 5, sailing: 40, tiba: 17, bongkar: 3, unloading: 15 })
  expect(ytdFromGrid(g)).toMatchObject({ bl: 13284352, blPct: 89, ds: 12837384, dsPct: 86 })
})
