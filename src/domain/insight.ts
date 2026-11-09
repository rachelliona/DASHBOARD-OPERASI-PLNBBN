import { Ship, STEPS, aggregatePlants, stepDays } from './monthly'
import { etaDelay, CMP_LABEL, Cmp } from './eta'
import { Stat, stepStats, CAUSE, SOLUSI, noteTags } from './sebab'

/** Mesin temuan otomatis: dihitung di peramban dari tanggal milestone, status, volume, dan catatan sheet.
 *  Semua hasil adalah DUGAAN berbasis data, bukan penyebab yang sudah dikonfirmasi. */
export type Sev = 'tinggi' | 'sedang' | 'rendah'
export type Insight = { id: string; kat: string; sev: Sev; judul: string; detail: string; solusi: string; pltu?: string; ship?: string; hari?: number | null; mitra?: string }
export const SEV_RANK: Record<Sev, number> = { tinggi: 0, sedang: 1, rendah: 2 }
export const SEV_COLOR: Record<Sev, string> = { tinggi: '#fb7185', sedang: '#fbbf24', rendah: '#38bdf8' }
export const KATEGORI: Record<string, string> = {
  'ETA': 'ETA (Tgl.) vs realisasi', 'Tertahan': 'Tertahan di satu tahap', 'Antrean': 'Antrean bongkar di PLTU', 'Pasokan': 'Risiko pemenuhan PLTU',
  'Volume': 'Selisih volume B/L vs D/S', 'Data': 'Kualitas data tanggal/status', 'Mitra': 'Kinerja mitra', 'Catatan': 'Kendala dari catatan sheet' }
const f1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')
const nf = (n: number) => Math.round(n).toLocaleString('id-ID')
const day = (t: number) => Math.floor(t / 864e5)
const FIN = new Set(['unloading'])
const label = (s: Ship) => `${s.plant} · ${s.tbbg.split(';')[0].trim() || s.si || s.id}`

export type InsightIn = { ships: Ship[]; ref: number; bulanIdx: number; tol?: number; base?: Ship[]; cmp?: Cmp }
export const CMP_SHORT: Record<Cmp, string> = { 1: 'POL', 6: 'PLTU', 8: 'Mulai bongkar', 9: 'Selesai bongkar' }
export type InsightOut = { list: Insight[]; stats: Stat[]; skor: number; ringkas: { tinggi: number; sedang: number; rendah: number }; perKat: { kat: string; n: number; tinggi: number }[]; bottleneck: { i: number; nama: string; n: number; lebih: number } | null; etaPol: { total: number; tepat: number; telat: number; cepat: number; belum: number; rata: number | null } }

export function buildInsights({ ships, ref, bulanIdx, tol = 1, base, cmp = 6 }: InsightIn): InsightOut {
  const list: Insight[] = []; const stats = stepStats(base && base.length >= ships.length ? base : ships, stepDays)
  const add = (x: Insight) => list.push(x)
  const etaPol = { total: 0, tepat: 0, telat: 0, cepat: 0, belum: 0, rata: null as number | null }; let sumLate = 0
  const mitraAgg = new Map<string, { n: number; late: number; days: number }>()
  const tibaPer = new Map<string, Ship[]>()
  const neg: Ship[] = [], miss: Ship[] = []
  for (const s of ships) {
    const active = !FIN.has(s.stage ?? '') && s.ms[9] == null; const d = stepDays(s.ms)
    // 1. ETA POL vs realisasi
    if (s.eta != null) {
      const e = etaDelay(s, cmp, ref); const CS = CMP_SHORT[cmp]; etaPol.total++
      if (e.kind === 'aktual') {
        const k = e.days!; const m = s.mitraReal || s.transport || '—'; const a = mitraAgg.get(m) ?? { n: 0, late: 0, days: 0 }; a.n++
        if (k > tol) { etaPol.telat++; sumLate += k; a.late++; a.days += k
          add({ id: 'eta-' + s.id, kat: 'ETA', sev: k >= 5 ? 'tinggi' : k >= 3 ? 'sedang' : 'rendah', judul: `Telat ${k} hari dari ETA (${CS})`, detail: `${label(s)}: ETA ${fmt(s.eta)}, realisasi ${CMP_LABEL[cmp]} ${fmt(s.ms[cmp]!)} (+${k} hari).${s.mitraReal ? ' Mitra: ' + s.mitraReal + '.' : ''}`,
            solusi: 'Telusuri tahap mana yang memakan waktu (lihat Gantt shipment ini), minta konfirmasi jadwal terbaru dari mitra transport, dan perbarui ETA di sheet agar PLTU bisa menyesuaikan jadwal bongkar.', pltu: s.plant, ship: s.id, hari: k, mitra: s.mitraReal }) }
        else if (k < -2) etaPol.cepat++; else etaPol.tepat++
        mitraAgg.set(m, a)
      } else if (e.kind === 'lewat-eta') { etaPol.belum++
        add({ id: 'etalewat-' + s.id, kat: 'ETA', sev: e.days! > 3 ? 'tinggi' : 'sedang', judul: `Lewat ETA ${e.days} hari, belum ${CMP_LABEL[cmp]}`, detail: `${label(s)}: ETA ${fmt(s.eta)} sudah lewat ${e.days} hari tetapi ${CMP_LABEL[cmp]} belum tercatat (status: ${s.status || '—'}).`,
          solusi: 'Cek posisi kapal/tongkang ke mitra transport; bila memang tertunda, perbarui ETA dan informasikan ke PLTU tujuan. Bila sudah tiba, lengkapi tanggalnya di sheet.', pltu: s.plant, ship: s.id, hari: e.days, mitra: s.mitraReal }) }
    } else if (active && s.etaTxt === '' && (s.stage === 'terjadwal' || s.stage === 'loading')) {
      add({ id: 'noeta-' + s.id, kat: 'Data', sev: 'rendah', judul: 'ETA (Tgl.) belum diisi', detail: `${label(s)} berstatus ${s.status || '—'} tetapi kolom Tgl. kosong sehingga ketepatan jadwal tidak bisa dipantau.`, solusi: 'Isi kolom Tgl. (ETA) dari hasil Rakor agar keterlambatan terdeteksi otomatis.', pltu: s.plant, ship: s.id })
    }
    // 2. tahap berjalan terlalu lama
    const needIdx = s.stage === 'unloading' ? 9 : s.stage === 'bongkar' ? 8 : s.stage === 'tiba' ? 6 : s.stage === 'sailing' ? 5 : s.stage === 'loading' ? 1 : -1
    const truk = /trucking|truk/i.test(s.tbbg + ' ' + s.moda)
    if (active && !truk) { const last = s.ms.reduce<number>((a, v, i) => v != null ? i : a, -1)
      if (last >= needIdx && last >= 1 && last < 9 && (stats[last]?.n ?? 0) >= 8) { const p = stats[last]?.p75, el = (ref - (s.ms[last] as number)) / 864e5
        if (p != null && el > p && el >= 2) add({ id: 'stuck-' + s.id, kat: 'Tertahan', sev: el > p * 2 && el >= 4 ? 'tinggi' : 'sedang', judul: `Tertahan di "${STEPS[last]}" ${f1(el)} hari`, detail: `${label(s)}: tahap ini biasanya ${f1(stats[last].med ?? p)} hari (P75 ${f1(p)} hari), sekarang sudah ${f1(el)} hari. Dugaan: ${CAUSE[last]}.`, solusi: SOLUSI[last], pltu: s.plant, ship: s.id, hari: Math.round(el), mitra: s.mitraReal }) } }
    // 3. antrean di PLTU
    if (s.stage === 'tiba') { const a = tibaPer.get(s.plant) ?? []; a.push(s); tibaPer.set(s.plant, a) }
    // 4. kualitas data
    if (d.some((x, i) => x == null && s.ms[i] != null && s.ms[i + 1] != null)) neg.push(s)
    const need = s.stage === 'unloading' ? 9 : s.stage === 'bongkar' ? 8 : s.stage === 'tiba' ? 6 : s.stage === 'sailing' ? 5 : s.stage === 'loading' ? 3 : -1
    if (need >= 1 && s.ms[need] == null) miss.push(s)
    // 5. volume
    if (s.anom && s.bl && s.ds) { const sel = s.ds - s.bl, pc = Math.abs(sel) / s.bl * 100
      add({ id: 'vol-' + s.id, kat: 'Volume', sev: pc > 10 ? 'tinggi' : 'sedang', judul: `D/S ${sel < 0 ? 'kurang' : 'lebih'} ${f1(pc)}% dari B/L`, detail: `${label(s)}: B/L ${nf(s.bl)} MT, D/S ${nf(s.ds)} MT (selisih ${sel > 0 ? '+' : ''}${nf(sel)} MT).`, solusi: 'Rekonsiliasi hasil surveyor muat vs bongkar; periksa draft survey, kadar air, dan kemungkinan susut/kehilangan di perjalanan.', pltu: s.plant, ship: s.id, hari: null }) }
    // 6. catatan sheet
    const tags = noteTags(s.note ?? '').filter(t => ['Dibatalkan', 'Kendala RKAB / izin', 'Cuaca', 'Dialihkan / rekonfirmasi'].includes(t))
    if (active && tags.length) add({ id: 'note-' + s.id, kat: 'Catatan', sev: tags.includes('Dibatalkan') || tags.includes('Kendala RKAB / izin') ? 'tinggi' : 'sedang', judul: `Catatan menyebut: ${tags.join(', ')}`, detail: `${label(s)} — "${(s.note ?? '').slice(0, 140)}"`, solusi: 'Konfirmasi status terkini dengan mitra/PLTU, lalu perbarui status dan ETA di sheet.', pltu: s.plant, ship: s.id })
  }
  etaPol.rata = etaPol.telat ? sumLate / etaPol.telat : null
  for (const [p, a] of tibaPer) if (a.length >= 3) add({ id: 'q-' + p, kat: 'Antrean', sev: a.length >= 5 ? 'tinggi' : 'sedang', judul: `${a.length} kapal antre di ${p}`, detail: `${a.length} shipment berstatus Tiba/Antri di ${p} (${nf(a.reduce((x, s) => x + (s.bl ?? s.vol), 0))} MT menunggu bongkar).`, solusi: SOLUSI[6], pltu: p, hari: a.length })
  if (neg.length) add({ id: 'neg', kat: 'Data', sev: 'sedang', judul: `${neg.length} shipment urutan tanggalnya terbalik`, detail: 'Tanggal tahap berikutnya lebih awal dari tahap sebelumnya, sehingga durasi tahap tidak bisa dihitung: ' + neg.slice(0, 4).map(label).join('; ') + (neg.length > 4 ? ` +${neg.length - 4} lainnya` : '') + '.', solusi: 'Periksa salah ketik tanggal/jam di sheet bulanan.', hari: neg.length })
  if (miss.length) add({ id: 'miss', kat: 'Data', sev: 'sedang', judul: `${miss.length} shipment statusnya maju tapi tanggalnya belum diisi`, detail: 'Status sudah di tahap lanjut namun tanggal milestone tahap itu kosong: ' + miss.slice(0, 4).map(label).join('; ') + (miss.length > 4 ? ` +${miss.length - 4} lainnya` : '') + '.', solusi: 'Lengkapi tanggal milestone agar analisis keterlambatan akurat.', hari: miss.length })
  // pasokan per PLTU (khusus bulan berjalan)
  const frac = (() => { const r = new Date(ref); const m = r.getUTCMonth(); if (m === bulanIdx) { const dim = new Date(Date.UTC(r.getUTCFullYear(), m + 1, 0)).getUTCDate(); return r.getUTCDate() / dim } return m > bulanIdx ? 1 : 0 })()
  for (const p of aggregatePlants(ships) as any[]) {
    const keb = p.target + p.carryOver; if (keb <= 0) continue; const pipe = p.loading + p.sailing + p.tiba + p.bongkar; const ds = p.unloading; const proj = (ds + pipe) / keb * 100; const act = ds / keb * 100
    const sched = p.terjadwal + p.loading + p.sailing + p.tiba + p.bongkar + p.unloading; const gap = keb - sched
    if (frac > 0 && frac < 1.01 && act < frac * 100 * 0.5 && frac >= 0.3) add({ id: 'pace-' + p.pltu, kat: 'Pasokan', sev: act < frac * 100 * 0.25 ? 'tinggi' : 'sedang', judul: `${p.pltu}: pemenuhan ${f1(act)}% (seharusnya ± ${f1(frac * 100)}%)`, detail: `Kebutuhan ${nf(keb)} MT, sudah dibongkar ${nf(ds)} MT, masih di perjalanan/antrean ${nf(pipe)} MT. Proyeksi bila semua yang berjalan tiba: ${f1(proj)}%.`, solusi: 'Percepat shipment yang sedang loading/sailing dan prioritaskan slot bongkar PLTU ini; cek apakah perlu tambahan alokasi.', pltu: p.pltu, hari: null })
    if (gap > keb * 0.15 && gap > 5000) add({ id: 'gap-' + p.pltu, kat: 'Pasokan', sev: gap > keb * 0.4 ? 'tinggi' : 'sedang', judul: `${p.pltu}: ${nf(gap)} MT belum terjadwal`, detail: `Kebutuhan ${nf(keb)} MT, baru ${nf(sched)} MT yang punya jadwal/progres (${f1(sched / keb * 100)}%).`, solusi: 'Terbitkan SI/jadwal muat tambahan atau alokasikan ulang dari mitra tambang yang masih punya stok.', pltu: p.pltu, hari: null })
  }
  // mitra
  for (const [m, a] of mitraAgg) if (a.n >= 3 && a.late / a.n >= 0.5 && m !== '—') add({ id: 'mitra-' + m, kat: 'Mitra', sev: a.late / a.n >= 0.75 ? 'tinggi' : 'sedang', judul: `${m}: ${a.late} dari ${a.n} shipment telat ke POL`, detail: `Rata-rata keterlambatan ${f1(a.days / a.late)} hari dari ETA POL.`, solusi: 'Jadwalkan evaluasi kepatuhan jadwal dengan mitra ini dan minta rencana perbaikan mobilisasi.', mitra: m, hari: null })
  list.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || (b.hari ?? 0) - (a.hari ?? 0))
  const ringkas = { tinggi: 0, sedang: 0, rendah: 0 }; list.forEach(i => ringkas[i.sev]++)
  const k = new Map<string, { n: number; tinggi: number }>(); list.forEach(i => { const a = k.get(i.kat) ?? { n: 0, tinggi: 0 }; a.n++; if (i.sev === 'tinggi') a.tinggi++; k.set(i.kat, a) })
  const perKat = [...k].map(([kat, v]) => ({ kat, ...v })).sort((a, b) => b.n - a.n)
  const skor = Math.max(0, Math.round(100 - Math.min(100, (ringkas.tinggi * 3 + ringkas.sedang * 1.2 + ringkas.rendah * 0.3) / Math.max(10, ships.length) * 45)))
  let bn: InsightOut['bottleneck'] = null
  stats.forEach((st, i) => { if (st.p75 == null || st.n < 8 || i === 0) return; let n = 0, lebih = 0; for (const s of ships) { const x = stepDays(s.ms)[i]; if (x != null && x > st.p75) { n++; lebih += x - st.p75 } } if (!bn || lebih > bn.lebih) bn = { i, nama: STEPS[i], n, lebih } })
  return { list, stats, skor, ringkas, perKat, bottleneck: bn, etaPol }
}
const fmt = (t: number) => new Date(t).toISOString().slice(8, 10) + '/' + new Date(t).toISOString().slice(5, 7)
export const todayRef = () => { const w = new Date(Date.now() + 7 * 36e5); return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) }
export { day }
