import { describe, expect, it } from 'vitest'
import { kosong, SI } from '../si/types'
import { bandingkan, cekKoreksi, fmtNomor, nomorBerikut, nomorDipakai, parseRentang, periksa, rentangId, statusOf, supersededIds } from '../si/logic'
import { dariSheet } from '../si/legacy'
const mk = (o: Partial<SI>): SI => ({ ...kosong(), id: 'x' + Math.random(), tahap: 'terbit', tahun: 2026, ...o })
describe('SI numbering', () => {
  it('format nomor', () => { expect(fmtNomor(3050, 2026)).toBe('3050.SI/EPI.03.01/DIR/2026'); expect(fmtNomor(248, 2024)).toBe('0248.SI/EPI.03.01/DIR/2024') })
  it('nomor berikut = max+1, termasuk blok, per tahun', () => { const r = [mk({ nomor: 10 }), mk({ nomor: 15 }), mk({ nomor: 99, tahun: 2025 })]; expect(nomorBerikut(r, [{ tahun: 2026, nomor: 20, ket: 'nodin' }], 2026)).toBe(21); expect(nomorBerikut([], [], 2027)).toBe(1) })
  it('deteksi dobel & nomor dipakai', () => { const r = [mk({ nomor: 5 }), mk({ nomor: 5 }), mk({ nomor: 6 })]; expect(periksa(r).dobel.size).toBe(1); expect(nomorDipakai(r, [], 2026, 6)).toBeTruthy(); expect(nomorDipakai(r, [], 2026, 7)).toBeUndefined() })
  it('deteksi nomor mundur terhadap tanggal', () => { const r = [mk({ nomor: 1, tanggal: '2026-01-05' }), mk({ nomor: 2, tanggal: '2026-01-03' })]; expect(periksa(r).masalah.some(m => m.kind === 'tanggal-mundur')).toBe(true) })
})
describe('laycan & status', () => {
  it('parse rentang', () => { expect(parseRentang('10-12/01', '2026-01-09')).toEqual(['2026-01-10', '2026-01-12']); expect(parseRentang('25-27', '2026-11-20')).toEqual(['2026-11-25', '2026-11-27']); expect(parseRentang('30/11-02/12', '2026-11-20')).toEqual(['2026-11-30', '2026-12-02']); expect(parseRentang('30-02', '2026-11-20')).toEqual(['2026-11-30', '2026-12-02']); expect(parseRentang('abc', '')).toBeNull() })
  it('rentang surat', () => { expect(rentangId('2026-11-17', '2026-11-19')).toBe('17-19 November 2026'); expect(rentangId('2026-12-07', '2026-12-08')).toBe('07-08 Desember 2026') })
  it('status lewat / segera / direvisi', () => {
    const a = mk({ id: 'a', nomor: 1, laycanMulai: '2026-11-10', laycanSelesai: '2026-11-12' }), b = mk({ id: 'b', nomor: 2, laycanMulai: '2026-11-22', laycanSelesai: '2026-11-24' }), c = mk({ id: 'c', nomor: 3, sebelumnyaId: 'a', revisiKe: 1, laycanMulai: '2026-12-10', laycanSelesai: '2026-12-12' })
    const sup = supersededIds([a, b, c]); expect(statusOf(a, '2026-11-20', sup)).toBe('direvisi'); expect(statusOf(b, '2026-11-20', sup)).toBe('segera'); expect(statusOf(c, '2026-11-20', sup)).toBe('aktif'); expect(statusOf({ ...b, laycanSelesai: '2026-11-19', laycanMulai: '2026-11-18' }, '2026-11-20', new Set())).toBe('lewat'); expect(statusOf({ ...b, laycanSelesai: '2026-09-19', laycanMulai: '2026-09-18' }, '2026-11-20', new Set())).toBe('arsip')
  })
})
describe('revisi vs koreksi', () => {
  const lama = mk({ nomor: 1, kapal: 'TB Seno Hidayat VI/BG Seno Hidayat VII', volume: 5200, laycanMulai: '2026-11-17', laycanSelesai: '2026-11-19', consignee: 'PLTU Labuan' })
  it('typo kecil lolos koreksi', () => { const c = cekKoreksi(lama, { ...lama, kapal: 'TB Seno Hidayat VI/BG Seno Hidayat VIII', consignee: 'PLTU Labuhan' }); expect(c.ok).toBe(true); expect(c.ubah.length).toBe(2) })
  it('ganti kapal / volume / laycan ditolak sebagai koreksi', () => { expect(cekKoreksi(lama, { ...lama, kapal: 'TB Mitra 12/BG Mitra 13' }).ok).toBe(false); expect(cekKoreksi(lama, { ...lama, volume: 5300 }).ok).toBe(false); expect(cekKoreksi(lama, { ...lama, laycanSelesai: '2026-11-20' }).ok).toBe(false) })
  it('bandingkan memberi dari→ke', () => { const u = bandingkan(lama, { ...lama, volume: 6000 }); expect(u).toEqual([{ f: 'volume', label: 'Volume (ton)', dari: '5200', ke: '6000' }]) })
})
describe('impor sheet', () => {
  it('baca grid bernomor, lewati slot kosong, carry-forward tanggal', () => {
    const csv = ',,,,,,,,,,,\n,,,,,,,,,,,\n,Tanggal,Nomor SI,Nomor SI Rev,Pemohon,Sumber Tambang,Pelabuhan Muat,Laycan,ETA POD,Pelabuhan Bongkar,Kepada,Keterangan Revisi,\n,,1,,,,,,,,,,\n,09/01/2026,27,,ANDI,AGM,SEI PUTING,10-12/01,17-18/01,,,,\n,,28,,ANDI,MIFA,LOT 3,,,,,,\n,,29,,,,,,,,,,\n'
    const r = dariSheet(csv); expect(r.map(x => x.nomor)).toEqual([27, 28]); expect(r[0].laycanMulai).toBe('2026-01-10'); expect(r[0].pemohon).toBe('Andi'); expect(r[1].tanggal).toBe('')
  })
})

describe('slot cadangan backdate', () => {
  it('cadangan muncul sebagai slot, bukan nomor terpakai', async () => {
    const { slotKosong, nomorBerikut, nomorDipakai } = await import('../si/logic')
    const mk = (n: number, t: string): any => ({ ...kosong(), id: 'x' + n, nomor: n, tahun: 2026, tanggal: t, tahap: 'terbit', sumber: 'sistem' })
    const rows = [mk(10, '2026-11-20'), mk(13, '2026-11-21')]; const blok = [{ tahun: 2026, nomor: 11, ket: 'Cadangan backdate (sebelum 2026-11-21)' }, { tahun: 2026, nomor: 12, ket: 'surat lain' }]
    const { slot } = slotKosong(rows, blok, 2026, '2026-11-20')
    expect(slot.find(s => s.n === 11)).toMatchObject({ cad: true, cocok: true }); expect(slot.find(s => s.n === 12)).toBeUndefined()
    expect(nomorDipakai(rows, blok, 2026, 11)).toBeUndefined(); expect(nomorDipakai(rows, blok, 2026, 12)).toBeTruthy(); expect(nomorBerikut(rows, blok, 2026)).toBe(14)
  })
})
