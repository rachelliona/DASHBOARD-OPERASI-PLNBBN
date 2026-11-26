import { describe, it, expect } from 'vitest'
import { parseOdsEs, parseOdsDocs, hitungDok } from '../domain/ods'
describe('ODS transport', () => {
  it('baca executive summary sampai TOTAL', () => {
    const es = parseOdsEs(',,\n,Mitra,N2,N3,N4,B,O1,O2,,d4,d3\n,BAG, Rp 1.000 , Rp 0 , Rp 2.000 , Rp 1.500 , Rp 500 , Rp 0 , Rp 3.000 ,5,1\n,BMI, Rp 0 ,,,,,, Rp 0 ,0,0\n,TOTAL,,,\n,XX, Rp 9 ')
    expect(es.map(x => x.m)).toEqual(['BAG', 'BMI']); expect(es[0].t).toBe(3000); expect(es[0].o1).toBe(500)
  })
  it('hitung dokumen belum dibayar & umur N4', () => {
    const h = 'NO SI,JENIS TAGIHAN,TERMIN PEMBAYARAN,SUMBER TAMBANG,NAMA KAPAL,SHIPMENT,VOLUME,TUJUAN,NO. INVOICE,TGL INVOICE,NO FAKTUR PAJAK,MITRA,TGL BL,TGL TIBA PLTU,PROSES BBN,NILAI TAGIHAN (BRUTO),a,b,c,d,e,f,g,h, DUE DATE,i,LAMA OVER DUEDATE,Keterangan'
    const row = (m: string, p: string, k: string) => ['1', '', '', '', 'TB X', '', '', '', '', '', '', m, '', '', p, 'Rp 100', '', '', '', '', '', '', '', '', '', '', '40', k].join(',')
    const d = parseOdsDocs([h, row('bag', '4', 'Overdue > 30 Hari'), row('BAG', '4', 'Overdue < 30 Hari'), row('BAG', '2', ''), row('BAG', '5', 'Lunas')].join('\n'))
    expect(d).toHaveLength(4); const C = hitungDok(d); expect(C.BAG).toEqual({ n2: 1, n3: 0, n4: 2, d1: 1, d2: 1 })
  })
})
