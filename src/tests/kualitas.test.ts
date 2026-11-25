import { describe, it, expect } from 'vitest'
import { parseKualitas, coaStatus, DAY } from '../domain/kualitas'
import { parseDurasi, skorEta, skorShort, kategori } from '../domain/durasi'
const row = (o: Record<number, string>) => { const r = new Array(70).fill(''); for (const [k, v] of Object.entries(o)) r[+k] = v; return r.map(v => /[,\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(',') }
const head = row({ 0: 'PLTU', 10: 'Mitra Real.', 13: 'TB/BG', 33: 'B/L', 34: 'D/S', 38: 'Complete Unloading', 43: 'GCV (Load)' })
const q8 = (g: string, tm: string) => [g, tm, '5', '0,3', '50', '1200', '99', '20']
const put = (o: Record<number, string>, s: number, v: string[]) => { v.forEach((x, i) => o[s + i] = x); return o }
const csv = [head, row(put(put({ 0: 'Paiton', 10: 'BIB', 13: 'TB A / BG B', 33: '7.438,28', 34: '7.431,17', 38: '02/01/26 03:00' }, 43, q8('3.912', '38,0')), 51, q8('3.802', '39,0'))),
  row({ 0: 'Subtotal' }), row(put({ 0: 'Suralaya', 10: 'XYZ', 13: 'TB C / BG D; Comp. Unload 05/01', 33: '5.000,00', 34: '4.990,00' }, 51, q8('4.100', '30,0')))].join('\n')
describe('kualitas', () => {
  it('baca per posisi kolom & hitung susut', () => { const r = parseKualitas(csv); expect(r).toHaveLength(2); expect(r[0].turun).toBe(110); expect(r[0].hasQ).toBe(true); expect(r[1].gcvU).toBe(4100); expect(r[1].gcvL).toBeNull() })
  it('status CoA', () => { const r = parseKualitas(csv); const t = r[0].selesaiBongkar!; expect(t).toBe(Date.UTC(2026, 0, 2)); expect(coaStatus(r[0], t)).toBe('ada'); const x = { ...r[0], gcvU: null }; expect(coaStatus(x, t + 3 * DAY)).toBe('jendela'); expect(coaStatus(x, t + 9 * DAY)).toBe('telat'); expect(coaStatus(x, t - 5 * DAY)).toBe('belum') })
  it('skor transport', () => { expect(skorEta(1)).toBe(100); expect(skorEta(5)).toBe(90); expect(skorEta(40)).toBe(25); expect(skorShort(1.6)).toBe(100); expect(skorShort(null)).toBe(25); expect(kategori(90)).toBe('Good') })
  it('parse durasi', () => { const t = 'a\n\n\n\n\n\nNo,Region,Genco,SHIPPER,Shipper (Fix),POL,POD,POD (Fix),Volume Rencana,x,x,x,x,x,x,ETA POL Rencana,ETA POL Realisasi,ETA POD Rencana,ETA POD,Volume Realisasi\n1,r,g,S,S1,KUTAI,P,AMPANA,"5,000",,,,,,,01-03/01,03/01/26,15/01/26,18/01/26,"5,200.000"\n'; const r = parseDurasi(t); expect(r).toHaveLength(1); expect(r[0].volRen).toBe(5000); expect(r[0].etaPolRen).toBe(Date.UTC(2026, 0, 3)) })
})
import { navFor, bisaKualitas } from '../config/nav'
describe('akses menu Kualitas', () => {
  it('hanya racel dan rendi', () => { expect(bisaKualitas({ id: 'Racel' })).toBe(true); expect(bisaKualitas({ id: 'rendi' })).toBe(true); expect(bisaKualitas({ id: 'popi' })).toBe(false); expect(bisaKualitas(null)).toBe(false)
    expect(navFor(true, false).some(n => n.label === 'Kualitas')).toBe(false); expect(navFor(false, true).some(n => n.label === 'Kualitas')).toBe(true); expect(navFor(false, true).some(n => n.label === 'Data')).toBe(false) })
})

import { nilai, STD_CADANGAN } from '../domain/reject'
describe('reject per mitra', () => { it('BIB batas GCV 3900, TM 37', () => { const r = parseKualitas(csv); const n = nilai(r[0], STD_CADANGAN)!; expect(n.reject).toBe(true); expect(n.bongkar.map(b => b.p)).toEqual(['GCV (GAR)', 'Total moisture']); expect(n.umpire).toBe(true); expect(nilai(r[1], STD_CADANGAN)).toBeNull() }) })
