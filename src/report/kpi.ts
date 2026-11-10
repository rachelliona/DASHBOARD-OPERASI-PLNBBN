import { TARGET_TAHUNAN } from '../config/sources'
/** Angka kartu KPI tahunan (slide 1) berasal dari "Dashboard 1" dan diisi manual; bawaan = angka kiriman 10 Nov 2026. */
export type KpiTahunan = { rencana: number; targetRkap: number; terkontrak: number; rkapTerkontrak: number; rkapRealisasi: number; proaktifTerkontrak: number; proaktifRealisasi: number; totalRealisasi: number; ytdPembagi: number; ytdBlManual: number; ytdDsManual: number; y2025: number[]; target: number[]; realisasi: (number | null)[]; prognosa: number[] }
export const KPI_DEFAULT: KpiTahunan = { rencana: 15540000, targetRkap: TARGET_TAHUNAN, terkontrak: 19057630, rkapTerkontrak: 9016000, rkapRealisasi: 8673891, proaktifTerkontrak: 10041630, proaktifRealisasi: 5429132, totalRealisasi: 14103022, ytdPembagi: 14900000, ytdBlManual: 0, ytdDsManual: 0,
  y2025: [0.55, 1.51, 2.66, 3.62, 4.59, 5.87, 7.18, 8.28, 9.76, 10.42, 11.15, 11.89], target: [0.31, 1.17, 2.34, 3.59, 5.03, 6.4, 7.82, 9.28, 10.71, 11.82, 12.54, 13.1], realisasi: [0.33, 1.18, 1.77, 2.66, 3.84, 5.62, 7.59, 9.46, 10.97, null, null, null], prognosa: [0.33, 1.18, 1.77, 2.66, 3.84, 5.62, 7.59, 9.46, 10.97, 11.33, 12.47, 13.55] }
const KEY = 'pln-kpi-tahunan'
export const loadKpi = (): KpiTahunan => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j ? { ...KPI_DEFAULT, ...j } : KPI_DEFAULT } catch { return KPI_DEFAULT } }
export const saveKpi = (k: KpiTahunan) => { try { localStorage.setItem(KEY, JSON.stringify(k)) } catch { /* abaikan */ } }
export const resetKpi = () => { try { localStorage.removeItem(KEY) } catch { /* abaikan */ } }
