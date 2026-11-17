import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useKontrak } from '../kontrakStore'
import { banding } from '../domain/kontrak'
import { BULAN } from '../domain/monthly'
import { fmtNum, fmtPct } from '../domain/format'
import type { DetailSpec } from '../components/Detail'
import { CLUSTER_VAR } from '../domain/kontrak'

/** Kontrak + realisasi dari tab bulanan 2026 (sumber yang sama dengan Ringkasan Realisasi). Cakupan: setahun atau satu bulan. */
export function useBanding(sembunyikanOutlier = false) {
  const { months, asOf, raw, status, fetchSheet } = useStore(); const k = useKontrak(); const [scope, setScope] = useState('ALL')
  useEffect(() => { if (asOf) return; (async () => { for (const b of BULAN) if (!raw[b] && !status[b]) await fetchSheet(b) })() }, [asOf])
  const loaded = BULAN.filter(b => months[b] && !months[b].missing.length)
  const { ships, idx } = useMemo(() => { const idx = new Map<any, number>(); const ships = (scope === 'ALL' ? loaded : loaded.filter(b => b === scope)).flatMap(b => (months[b].ships as any[]).map(s => { idx.set(s, BULAN.indexOf(b)); return s })); return { ships, idx } }, [months, scope, loaded.join()])
  const b = useMemo(() => loaded.length ? banding(sembunyikanOutlier ? k.rows.filter(r => r.vol <= 5e6) : k.rows, ships, k.alias, s => idx.get(s) ?? null) : null, [ships, idx, k.rows, k.alias, sembunyikanOutlier])
  const sc = { label: scope === 'ALL' ? `Tahun 2026 (${loaded.length} bulan termuat)` : `${scope} 2026`, ui: <label className="flex items-center gap-2 text-xs no-print"><span className="text-slate-400">Bulan:</span><select aria-label="Cakupan bulan" value={scope} onChange={e => setScope(e.target.value)}><option value="ALL">Semua bulan (setahun)</option>{BULAN.map(x => <option key={x} disabled={!loaded.includes(x)}>{x}</option>)}</select></label> }
  return { b, sc, k, ready: loaded.length > 0 }
}
export const MONTHS3 = BULAN.map(x => x.slice(0, 3))

/** Isi popup satu kontrak. m = 'ds' (bongkar) atau 'bl' (muat). */
export function kontrakSpec(r: ReturnType<typeof banding>['kontrak'][number], b: ReturnType<typeof banding>, m: 'ds' | 'bl', scope: string): DetailSpec {
  const real = r.real[m], pct = r.vol > 0 ? real / r.vol * 100 : null, mk = m === 'ds' ? 'Unloading (D/S)' : 'Loading (B/L)'
  const lain = b.kontrak.filter(x => x.id !== r.id && x.tambang === r.tambang)
  return { title: `${r.pelanggan} · ${r.tambang}`, sub: `Kontrak No ${r.no} · ${scope}`, color: CLUSTER_VAR[r.cluster],
    stats: [{ l: 'Volume kontrak', v: fmtNum(r.vol) + ' MT' }, { l: 'GAR · cluster', v: `${r.gar} · ${r.cluster}` }, { l: 'Status', v: r.status ? 'On progress kontrak baru' : 'Terkontrak', c: r.status ? '#fbbf24' : '#34d399' },
      { l: `Realisasi ${mk}`, v: fmtNum(real) + ' MT' }, { l: 'Pemenuhan', v: fmtPct(pct) }, { l: r.vol - real >= 0 ? 'Sisa kontrak' : 'Melebihi kontrak', v: fmtNum(Math.abs(r.vol - real)) + ' MT', c: r.vol - real < 0 ? '#fbbf24' : undefined }],
    note: r.payung ? 'Kontrak payung (lintas PLTU): realisasi adalah alokasi shipment pemasok ini ke PLTU yang tidak punya kontrak khusus, dibagi menurut volume kontrak. Angka bersifat estimasi.' : `Realisasi dihitung dari shipment ke ${(r.plants.length ? r.plants.length : 'beberapa')} PLTU terkait dengan pemasok yang sama. Bila ada beberapa kontrak pada pasangan yang sama, dibagi menurut volume.`,
    trend: (m === 'ds' ? r.real.bln : r.real.blnBl).some(x => x > 0) ? { title: `${mk} per bulan (MT, estimasi alokasi)`, labels: MONTHS3, data: m === 'ds' ? r.real.bln : r.real.blnBl, color: CLUSTER_VAR[r.cluster], unit: 'MT' } : undefined,
    table: lain.length ? { head: ['Kontrak lain pemasok ini', 'GAR', 'Volume (MT)'], rows: lain.map(x => [x.pelanggan, x.gar, fmtNum(x.vol)]), align: ['l', 'r', 'r'] } : undefined,
    actions: [{ label: 'Buka perbandingan', to: '/kontrak/banding' }] }
}
