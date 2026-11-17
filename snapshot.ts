import type { Parsed } from './csv'
import { BULAN, parseMonthly } from './monthly'
/** Foto keadaan data pada satu hari: sheet ALL Shipment + semua sheet bulanan sampai bulan berjalan, sudah diolah. */
export function buildSnapshot(get: (name: string) => Parsed, now: Date, at: string) {
  const wib = new Date(now.getTime() + 7 * 36e5), mi = wib.getUTCMonth()
  const pack = (t: Parsed, b: string) => { const m = parseMonthly(t, b); return { ships: m.ships, sub: m.sub, skipped: m.skipped, missing: m.missing } }
  const months: Record<string, ReturnType<typeof pack>> = {}
  for (const b of BULAN.slice(0, mi + 1)) months[b] = pack(get(b), b)
  return { v: 1, date: wib.toISOString().slice(0, 10), at, bulan: BULAN[mi], all: pack(get('ALL Shipment'), 'Januari'), months }
}
export const sheetsNeeded = (now: Date) => ['ALL Shipment', ...BULAN.slice(0, new Date(now.getTime() + 7 * 36e5).getUTCMonth() + 1)]
