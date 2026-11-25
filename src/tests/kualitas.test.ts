import { describe, it, expect } from 'vitest'
import { parseKualitas, coaStatus, DAY } from '../domain/kualitas'
import { parseDurasi, skorEta, skorShort, kategori } from '../domain/durasi'
const csv = 'PLTU,Mitra Real.,Skema,B/L,D/S,Complete Unloading,GCV (Load),GCV (Unload),TM (Load),TM (Unload)\nPaiton,ABC,FOB,"7.438,28","7.431,17",02/01/26 03:00,"3.912","3.802",38,39\nSubtotal,,,1,1,,,,,\nPLTU,Mitra Real.,Skema,B/L,D/S,Complete Unloading,GCV (Load)\nSuralaya,XYZ,CIF,"5.000","4.990",05/01/26 10:00,"4.100"\n'
describe('kualitas', () => {
  it('baca per blok & hitung susut', () => { const r = parseKualitas(csv); expect(r).toHaveLength(2); expect(r[0].turun).toBe(110); expect(r[1].gcvU).toBeNull() })
  it('status CoA', () => { const r = parseKualitas(csv); const t = r[1].selesaiBongkar!; expect(coaStatus(r[0], t)).toBe('ada'); expect(coaStatus(r[1], t + 3 * DAY)).toBe('jendela'); expect(coaStatus(r[1], t + 9 * DAY)).toBe('telat'); expect(coaStatus(r[1], t - 5 * DAY)).toBe('belum') })
  it('skor transport', () => { expect(skorEta(1)).toBe(100); expect(skorEta(5)).toBe(90); expect(skorEta(40)).toBe(25); expect(skorShort(1.6)).toBe(100); expect(skorShort(null)).toBe(25); expect(kategori(90)).toBe('Good') })
  it('parse durasi', () => { const t = 'a\n\n\n\n\n\nNo,Region,Genco,SHIPPER,Shipper (Fix),POL,POD,POD (Fix),Volume Rencana,x,x,x,x,x,x,ETA POL Rencana,ETA POL Realisasi,ETA POD Rencana,ETA POD,Volume Realisasi\n1,r,g,S,S1,KUTAI,P,AMPANA,"5,000",,,,,,,01-03/01,03/01/26,15/01/26,18/01/26,"5,200.000"\n'; const r = parseDurasi(t); expect(r).toHaveLength(1); expect(r[0].volRen).toBe(5000); expect(r[0].etaPolRen).toBe(Date.UTC(2026, 0, 3)) })
})
