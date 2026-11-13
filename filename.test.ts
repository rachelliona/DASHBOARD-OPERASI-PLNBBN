import { it, expect } from 'vitest'
import { fileName } from '../report/export'
it('nama file laporan harian mengikuti tanggal unduh', () => { expect(fileName('pdf', new Date(2026, 10, 10))).toBe('LAPORAN HARIAN OPERASI_10 November 2026.pdf'); expect(fileName('pptx', new Date(2026, 0, 5))).toBe('LAPORAN HARIAN OPERASI_5 Januari 2026.pptx') })
