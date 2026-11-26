import { describe, it, expect } from 'vitest'
import { parseBbDocs, rekapBb, mitraEs2026, kodeMitra } from '../domain/odsBatubara'

const H = ',TAHUN PASOK,NO SI,SUMBER TAMBANG,SKEMA,.,SHIP KE,SHIPMENT,VOLUME,TUJUAN,PIP/PNP/PLN/IPP/NK,BULAN PASOKAN,PROSES BBN,HARGA,DPP,PPN 11%,PPH 22,REALISASI,KET,Lama Hari JT sd Terbayar,DUE DATE,TGL DIBAYAR,OVER DUE (1),DUE DATE HARI KERJA,OVER DUE (1),LAMA OVER DUEDATE,.,KETERANGAN,Rencana Tgl Bayar,KLASIFIKASI UMUR HUTANG'
const row = (si: string, tb: string, p: string, harga: string, lama: string, ket: string) => `1,2026,${si},${tb},FOB,,7,TB A / BG B,"7,353.292",PALU 3,PLN,Oct-26,${p},"  ${harga} ","  1,000 ","  110 ","  15 ","  1,095 ",,,"Saturday, November 28, 2026",,0,,0,${lama},,${ket},,${ket}`
const CSV = [',,,,,,,,,,,Keterangan', H, row('2594', 'JG - AI', '4', '2,000,000,000', '-3', 'Belum Overdue'), row('2007', 'KJA', '4', '1,000,000,000', '8', 'Overdue <30 Hari'), row('1900', 'BIB', '4', '3,000,000,000', '45', 'Overdue > 30 hari'), row('2700', 'BIB', '3', '500,000,000', '', 'Verifikasi ODS'), row('100', 'AGM', '5', '9,000,000,000', '1', 'Lunas'), ',,,,,,,,,,,,Total Hutang'].join('\n')

describe('ODS Batubara', () => {
  it('baca baris shipment + rincian nilai', () => {
    const d = parseBbDocs(CSV); expect(d.length).toBe(5)
    const a = d[0]; expect(a).toMatchObject({ si: '2594', mitra: 'JG', tambang: 'JG - AI', shipKe: '7', kapal: 'TB A / BG B', volume: 7353.292, tujuan: 'PALU 3', proses: '4', nilai: 2e9, dpp: 1000, ppn: 110, pph: 15, realisasi: 1095, lamaOd: -3 })
    expect(kodeMitra('JG - BKPL')).toBe('JG')
  })
  it('rekap per mitra: N3, N4 belum/ <30 / >30, lunas tidak dihitung', () => {
    const r = rekapBb(parseBbDocs(CSV), ['AGM', 'JG']); const g = (m: string) => r.find(x => x.m === m)!
    expect(g('BIB')).toMatchObject({ n3: 5e8, n4: 3e9, o2: 3e9, t: 3.5e9 }); expect(g('KJA').o1).toBe(1e9); expect(g('JG').b).toBe(2e9); expect(g('AGM').t).toBe(0)
  })
  it('nama mitra dari Executive Summary 2026', () => {
    const es = ['2025', ',Mitra', ',AAA', ',TOTAL', '2026', ',KETERANGAN', ',,Proses,,,Rincian Overdue', ',Mitra,Proses Verifikasi (Rp)', '1,AGM,1', '2,BSSR,2', ',TOTAL,3'].join('\n')
    expect(mitraEs2026(es)).toEqual(['AGM', 'BSSR'])
  })
})
