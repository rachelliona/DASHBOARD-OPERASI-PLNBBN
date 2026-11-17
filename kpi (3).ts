import { STAGES } from './status'
type R = Record<string, any>
export const sum = (rows: R[], k: string) => rows.reduce((a, r) => a + (r[k] ?? 0), 0)
export const stageTotals = (rows: R[]) => Object.fromEntries(STAGES.map(s => [s.key, sum(rows, s.key)])) as Record<string, number>
/** Shipment unik berdasarkan ID, bukan jumlah baris. */
export const distinctShipments = (rows: R[]) => new Set(rows.map(r => String(r.id ?? '').trim()).filter(Boolean)).size
export const duplicateIds = (rows: R[]) => rows.length - new Set(rows.map(r => String(r.id ?? '').trim())).size
export const pct = (actual: number, target: number | null | undefined) => target && target > 0 ? (actual / target) * 100 : null
/** Realisasi = Unloading (D/S). Pemenuhan = Unloading ÷ (Konfirmasi + Carry Over), mengikuti rumus Dashboard 1. */
export const plantActual = (r: R) => r.ds ?? r.unloading ?? 0
export const kebutuhan = (r: R) => (r.target ?? 0) + (r.carryOver ?? 0)
export function attention(rows: R[], threshold: number): (R & { p: number | null })[] {
  return rows.map(r => ({ ...r, p: pct(plantActual(r), kebutuhan(r)) }) as R & { p: number | null }).filter(r => r.p != null && r.p < threshold).sort((a, b) => a.p! - b.p!)
}
export const KPI_DEFS = {
  target: 'Konfirmasi bulan ini = Σ kolom Jumlah pada baris berkonfirmasi bulan berjalan (MT).',
  pemenuhan: 'Complete Unloading (Σ D/S) ÷ (Konfirmasi + Carry Over) × 100%, mengikuti Dashboard 1. Tidak dihitung jika penyebut 0.',
  shipment: 'Jumlah ID shipment unik pada dataset shipment (bukan jumlah baris).',
}
