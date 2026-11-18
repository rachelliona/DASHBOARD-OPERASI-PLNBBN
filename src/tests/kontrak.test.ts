import { describe, it, expect } from 'vitest'
import { banding, buildResolver, clusterOf, parsePaste, partsOf, seedRows, sKey } from '../domain/kontrak'
const sh = (o: any) => ({ id: 'x' + Math.random(), plant: 'Cilacap', konf: 'bulan', jumlah: 1, tbbg: '', status: '', stage: null, si: '', mitraReal: '', sumber: '', jetty: '', transport: '', moda: '', konfRaw: 'Maret', eta: null, etaTxt: '', ms: Array(10).fill(null), anom: false, bl: 0, ds: 0, vol: 0, ...o }) as any
describe('kontrak', () => {
  it('cluster dari GAR', () => { expect(clusterOf(4399)).toBe('LRC'); expect(clusterOf(4400)).toBe('MRC'); expect(clusterOf(5000)).toBe('HRC') })
  it('seed 50 kontrak, total sesuai lampiran', () => { const s = seedRows(); expect(s.length).toBe(50); expect(s.reduce((a, r) => a + r.vol, 0)).toBe(sumSeed()) })
  it('nama gabungan dan badan usaha', () => { expect(sKey('PT Baramulti Suksessarana, Tbk')).toBe('baramulti suksessarana'); expect(partsOf('PT Batu Hitam Jaya & PT Seluma Prima Coal')).toEqual(['batu hitam jaya', 'seluma prima coal']) })
  it('salah ketik dicocokkan', () => {
    const R = buildResolver(seedRows())
    expect(R.resolve({ sumber: 'PT Borneoa Indobara', mitraReal: '' }).ent).toBe('borneo indobara')
    expect(R.resolve({ sumber: 'PT Antang Gunung Maratus', mitraReal: '' }).ent).toBe('antang gunung meratus')
    expect(R.resolve({ sumber: 'PT Manambang Muara Enim', mitraReal: '' }).ent).toBe('menambang muara enim')
    expect(R.resolve({ sumber: 'PT Energi Batubara Perkasa', mitraReal: 'BBS' }).ent).toBe('bainra bumi sejahtera')
    expect(R.resolve({ sumber: 'PT MIFA Bersaudara', mitraReal: 'MIFA' }).ent).toBeNull()
  })
  it('alokasi: kontrak PLTU lebih dulu, payung sisanya, total terjaga', () => {
    const ships = [sh({ plant: 'Cilacap', mitraReal: 'BBS', sumber: 'PT Energi Batubara Perkasa', ds: 1000, bl: 1200 }), sh({ plant: 'Pacitan', mitraReal: 'BBS', ds: 500, bl: 500 }), sh({ plant: 'Jawa 7', mitraReal: 'BIB', ds: 700, bl: 700 }), sh({ plant: 'Rembang', sumber: 'PT MIFA Bersaudara', ds: 300, bl: 300 }), sh({ ds: 0, bl: 0 })]
    const b = banding(seedRows(), ships)
    const bbs = b.pemasok.find(p => p.key === 'bainra bumi sejahtera')!; expect(bbs.real.ds).toBe(1500)
    const cil = b.kontrak.filter(k => k.pelanggan === 'PLTU Cilacap' && k.tambang.includes('Bainra')).reduce((a, k) => a + k.real.ds, 0); expect(Math.round(cil)).toBe(1000)
    expect(b.tanpaKontrak[0].label).toBe('PT MIFA Bersaudara')
    const sumK = b.kontrak.reduce((a, k) => a + k.real.ds, 0), luar = b.pemasok.reduce((a, p) => a + p.luar.ds, 0)
    expect(Math.round(sumK + luar + b.tanpaKontrak.reduce((a, t) => a + t.real.ds, 0) + b.tanpaNama.ds)).toBe(b.total.real.ds)
  })
  it('tempel dari Excel', () => { const r = parsePaste('4\tPLN/PNP\tPT Artha Tunggal Mandiri\t3700\tLRC\t687,000\tTerkontrak\n9\tX\tY\t5200\t\t1.000\tOn Progress'); expect(r.length).toBe(2); expect(r[0].vol).toBe(687000); expect(r[1].cluster).toBe('HRC'); expect(r[1].status).toBe(1) })
})
function sumSeed() { return 687000 + 52500 + 30000 + 70000 + 30000 + 105000 + 50000 + 11608000 + 226000 * 5 + 400000 + 250000 + 400000 + 165000 + 580000 + 544500 + 1075500 + 200000 + 30000 + 45000 + 35000 + 500000 + 350000 + 15000 + 7500 * 5 + 7500 + 15000 + 22500 + 100000 + 40000 + 400000 + 1050000 + 480000 + 77000 + 100000 + 100000 + 23000 + 1150000 + 150000 + 150000 + 351915 + 50000 + 150000 }

import { withJam, jamDari, fmtUpdate } from '../domain/view'
describe('jam update laporan', () => {
  it('mengganti jam dan menjaga tanggal', () => {
    expect(withJam('8 November 2026 pukul 07.27 WIB', '15:05')).toBe('8 November 2026 pukul 15.05 WIB')
    expect(fmtUpdate(withJam('8 November 2026 pukul 07.27 WIB', '09:00'))).toBe('8 NOVEMBER 2026, 09.00 WIB')
    expect(jamDari('8 November 2026 pukul 07.27 WIB')).toBe('07:27'); expect(withJam('x', 'bad')).toBe('x')
  })
})
