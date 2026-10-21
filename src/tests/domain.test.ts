import { describe, it, expect } from 'vitest'
import { parseIdNumber, parseIdDate, fmtNum } from '../domain/format'
import { stageOf } from '../domain/status'
import { applyMapping, KINDS } from '../domain/schema'
import { parseCsv } from '../domain/csv'
import { distinctShipments, pct, attention } from '../domain/kpi'
import { SOURCES, buildUrl } from '../config/sources'
describe('format', () => {
  it('angka Indonesia', () => { expect(parseIdNumber('1.234,5')).toBe(1234.5); expect(parseIdNumber('12.500')).toBe(12500); expect(parseIdNumber('7,5')).toBe(7.5); expect(parseIdNumber('-')).toBeNull(); expect(parseIdNumber('abc')).toBeNull(); expect(parseIdNumber('(300)')).toBe(-300) })
  it('tanggal', () => { expect(parseIdDate('21/10/2026')).toBe('2026-10-21'); expect(parseIdDate('31/02/2026')).toBeNull(); expect(parseIdDate('2026-10-21')).toBe('2026-10-21') })
  it('format id-ID', () => { expect(fmtNum(1234567.89, 2)).toBe('1.234.567,89'); expect(fmtNum(null)).toBe('—') })
})
describe('status', () => { it('istilah laporan harian', () => { expect(stageOf('Carry Over')).toBe('carryOver'); expect(stageOf('proses bongkar')).toBe('bongkar'); expect(stageOf('Tiba/Antri')).toBe('tiba'); expect(stageOf('Sandar')).toBeNull() }) })
describe('csv & pemetaan', () => {
  it('parse quoted', () => { const p = parseCsv('a,b\n"x, y",2\n'); expect(p.rows[0].a).toBe('x, y') })
  it('tolak baris bermasalah, tidak membuang diam-diam', () => {
    const r = applyMapping([{ P: 'Paiton', T: '1.000' }, { P: '', T: '5' }, { P: 'Rembang', T: 'xx' }], { pltu: 'P', target: 'T' }, KINDS.plant.fields)
    expect(r.ok).toHaveLength(1); expect(r.ok[0].target).toBe(1000); expect(r.rejected.map(x => x.row)).toEqual([3, 4])
  })
  it('koordinat di luar Indonesia ditolak', () => { const r = applyMapping([{ n: 'X', a: '40', b: '10' }], { nama: 'n', lat: 'a', lon: 'b' }, KINDS.lokasi.fields); expect(r.rejected).toHaveLength(1) })
  it('bujur 106,816 tidak dibaca sebagai ribuan', () => { const r = applyMapping([{ n: 'X', a: '-6,2', b: '106.816' }], { nama: 'n', lat: 'a', lon: 'b' }, KINDS.lokasi.fields); expect(r.ok[0].lon).toBe(106.816) })
})
describe('KPI', () => {
  it('shipment unik', () => expect(distinctShipments([{ id: 'A' }, { id: 'A' }, { id: ' ' }, { id: 'B' }])).toBe(2))
  it('pemenuhan null jika target kosong', () => { expect(pct(5, 0)).toBeNull(); expect(pct(5, null)).toBeNull(); expect(pct(50, 100)).toBe(50) })
  it('perlu perhatian', () => expect(attention([{ pltu: 'A', target: 100, unloading: 10 }, { pltu: 'B', target: 0, unloading: 0 }, { pltu: 'C', target: 100, unloading: 90 }], 70).map(r => r.pltu)).toEqual(['A']))
})
describe('registri', () => { it('31 sumber, URL persis', () => { expect(SOURCES).toHaveLength(31); expect(buildUrl('444499332')).toBe('https://docs.google.com/spreadsheets/d/e/2PACX-1vTNubBR6mjW_E_aD78ZK64jqZw-in5h9qa_6fbgCh2hOgzTl1PjFMeVO_2jij8SsDHUDOVcQngIZ5SB/pub?gid=444499332&single=true&output=csv') }) })
