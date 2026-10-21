import { parseIdNumber, parseIdDate } from './format'
import { STAGES, stageOf } from './status'
export type F = { key: string; label: string; type: 'text' | 'num' | 'date' | 'status' | 'coord'; required?: boolean }
export type Rejected = { row: number; reason: string }
export const KINDS: Record<string, { label: string; fields: F[] }> = {
  plant: { label: 'Laporan Harian PLTU (satu baris per PLTU)', fields: [
    { key: 'pltu', label: 'PLTU', type: 'text', required: true }, { key: 'wilayah', label: 'Wilayah', type: 'text' },
    { key: 'target', label: 'Target / Kebutuhan (MT)', type: 'num' },
    ...STAGES.map(s => ({ key: s.key, label: `${s.label} (MT)`, type: 'num' as const })),
    { key: 'sumber', label: 'Sumber Tambang', type: 'text' }, { key: 'keterangan', label: 'Keterangan', type: 'text' }] },
  shipment: { label: 'Shipment (satu baris per shipment)', fields: [
    { key: 'id', label: 'ID Shipment', type: 'text', required: true }, { key: 'si', label: 'Nomor SI', type: 'text' },
    { key: 'pltu', label: 'PLTU / IPP Tujuan', type: 'text', required: true }, { key: 'wilayah', label: 'Wilayah', type: 'text' },
    { key: 'asal', label: 'Asal / Lokasi Muat', type: 'text' }, { key: 'mitraTambang', label: 'Mitra Tambang', type: 'text' },
    { key: 'mitraTransport', label: 'Mitra Transport', type: 'text' }, { key: 'kapal', label: 'Kapal / Tongkang', type: 'text' },
    { key: 'volume', label: 'Volume (MT)', type: 'num' }, { key: 'status', label: 'Status', type: 'status' },
    { key: 'eta', label: 'ETA', type: 'date' }, { key: 'keterangan', label: 'Keterangan', type: 'text' }] },
  lokasi: { label: 'Master Lokasi (PLTU, IPP, jetty, tambang)', fields: [
    { key: 'nama', label: 'Nama Lokasi', type: 'text', required: true }, { key: 'lat', label: 'Lintang (lat)', type: 'coord', required: true },
    { key: 'lon', label: 'Bujur (lon)', type: 'coord', required: true }, { key: 'jenis', label: 'Jenis', type: 'text' }] },
}
export function applyMapping(rows: Record<string, any>[], map: Record<string, string>, fields: F[]) {
  const ok: Record<string, any>[] = [], rejected: Rejected[] = []
  rows.forEach((r, i) => {
    const o: Record<string, any> = {}; let bad = ''
    for (const f of fields) {
      const h = map[f.key]; const raw = h ? String(r[h] ?? '').trim() : ''
      if (!raw) { if (f.required && !bad) bad = `Kolom wajib "${f.label}" kosong`; o[f.key] = null; continue }
      if (f.type === 'num') { const n = parseIdNumber(raw); if (n == null && raw !== '-' && !bad) bad = `Angka tidak valid pada "${f.label}": ${raw}`; o[f.key] = n }
      else if (f.type === 'coord') {
        const n = Number(raw.replace(',', '.')); const lim = f.key === 'lat' ? [-11.5, 6.5] : [94, 141.5]
        if (!(n >= lim[0] && n <= lim[1]) && !bad) bad = `${f.label} di luar wilayah Indonesia atau tidak valid: ${raw}`; o[f.key] = Number.isFinite(n) ? n : null
      } else if (f.type === 'date') { const d = parseIdDate(raw); if (!d && !bad) bad = `Tanggal tidak valid pada "${f.label}": ${raw}`; o[f.key] = d }
      else if (f.type === 'status') { o[f.key + 'Raw'] = raw; o[f.key] = stageOf(raw) }
      else o[f.key] = raw
    }
    bad ? rejected.push({ row: i + 2, reason: bad }) : ok.push(o)
  })
  return { ok, rejected }
}
