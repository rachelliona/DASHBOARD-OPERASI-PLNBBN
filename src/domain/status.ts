/** Istilah tahapan mengikuti laporan harian; tidak diterjemahkan dan tidak digabung. */
export const STAGES = [
  { key: 'carryOver', label: 'Carry Over', color: '#ef4444' },
  { key: 'loading', label: 'Loading', color: '#38bdf8' },
  { key: 'sailing', label: 'Sailing', color: '#f97316' },
  { key: 'tiba', label: 'Tiba/Antri', color: '#4f6bed' },
  { key: 'bongkar', label: 'Proses Bongkar', color: '#a855f7' },
  { key: 'unloading', label: 'Unloading', color: '#22c55e' },
]
export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
/** Pemetaan status -> tahapan (dapat dikonfigurasi). Nilai yang tidak dikenal TIDAK ditebak. */
export const STATUS_ALIASES: Record<string, string> = Object.fromEntries(STAGES.map(s => [norm(s.label), s.key]))
export const stageOf = (raw: unknown): string | null => STATUS_ALIASES[norm(raw)] ?? null
export const stageLabel = (k: string | null) => STAGES.find(s => s.key === k)?.label ?? 'Belum Dipetakan'
export const REGIONS = ['JAMALI', 'Sumatra', 'Kalimantan', 'Sulmapana 1', 'Sulmapana 2', 'PLTU IPP']
