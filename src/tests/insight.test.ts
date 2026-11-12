import { describe, expect, it } from 'vitest'
import { buildInsights } from '../domain/insight'
import { isAdmin, navFor, NAV } from '../config/nav'
const D = (m: number, d: number, h = 0) => Date.UTC(2026, m - 1, d, h)
const ship = (o: any) => ({ id: 'x', plant: 'Paiton', konf: 'bulan', jumlah: 7500, tbbg: 'TB A/BG B', status: '', stage: 'sailing', si: '1', mitraReal: 'M1', sumber: '', jetty: '', transport: '', moda: '', konfRaw: 'November', eta: null, etaTxt: '', ms: Array(10).fill(null), anom: false, bl: 7500, ds: null, vol: 7500, ...o })
describe('buildInsights', () => {
  it('ETA terlewati tanpa realisasi PLTU -> temuan ETA', () => {
    const o = buildInsights({ ships: [ship({ eta: D(11, 2), etaTxt: '2', ms: [D(10, 20), D(10, 22), D(10, 23), D(10, 23), D(10, 24), D(10, 25), null, null, null, null] })], ref: D(11, 8), bulanIdx: 10 })
    expect(o.list.find(i => i.kat === 'ETA')?.hari).toBe(6)
  })
  it('realisasi PLTU telat dari ETA dihitung telat', () => {
    const o = buildInsights({ ships: [ship({ stage: 'tiba', eta: D(11, 2), etaTxt: '2', ms: [null, D(10, 22), null, null, null, D(10, 25), D(11, 6), null, null, null] })], ref: D(11, 8), bulanIdx: 10 })
    expect(o.etaPol.telat).toBe(1); expect(o.list[0].judul).toContain('4 hari')
  })
  it('status lebih maju dari tanggal milestone = masalah data, bukan tertahan', () => {
    const base = Array.from({ length: 12 }, (_, i) => ship({ id: 'b' + i, stage: 'unloading', ds: 7500, ms: [D(9, 1), D(9, 3), D(9, 4), D(9, 4), D(9, 5), D(9, 5), D(9, 8), D(9, 8), D(9, 9), D(9, 10)] }))
    const o = buildInsights({ ships: [ship({ stage: 'tiba', ms: [D(10, 1), D(10, 3), D(10, 4), D(10, 4), D(10, 5), null, null, null, null, null] })], ref: D(11, 8), bulanIdx: 10, base })
    expect(o.list.some(i => i.kat === 'Tertahan')).toBe(false); expect(o.list.length).toBe(0)
  })
  it('analisis hanya memuat temuan shipment (telat, muat, tiba/bongkar), bukan pemenuhan PLTU', () => {
    const o = buildInsights({ ships: [ship({ jumlah: 50000, stage: 'terjadwal', vol: 7500 })], ref: D(11, 8), bulanIdx: 10 })
    expect(o.list.every(i => i.grp != null && i.kat !== 'Pasokan')).toBe(true)
  })
})
describe('akses menu Data', () => {
  it('hanya akun racel (tanpa peduli huruf besar)', () => { expect(isAdmin({ id: 'Racel' })).toBe(true); expect(isAdmin({ id: ' racel ' })).toBe(true); expect(isAdmin({ id: 'budi' })).toBe(false); expect(isAdmin(null)).toBe(false) })
  it('pengguna lain tidak melihat menu Data', () => { expect(navFor(false).some(n => n.label === 'Data')).toBe(false); expect(navFor(true).some(n => n.label === 'Data')).toBe(true); expect(NAV.some(n => n.label === 'Mitra dan Kepatuhan')).toBe(true) })
})
