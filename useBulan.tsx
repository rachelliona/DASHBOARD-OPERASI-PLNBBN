import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { BULAN } from '../domain/monthly'
import { Cmp, CMP_LABEL } from '../domain/eta'
/** Pemilih bulan bersama untuk halaman analisis: bulan aktif dari sheet langsung, bulan lain dimuat saat dipilih. */
export function useBulan() {
  const { months, monthly, bulanAktif, asOf, raw, status, fetchSheet } = useStore(); const [bln, setBln] = useState(''); const b = bln || bulanAktif
  useEffect(() => { if (!asOf && b !== bulanAktif && BULAN.includes(b) && !raw[b] && !status[b]) fetchSheet(b) }, [b, asOf])
  const md = b === bulanAktif ? monthly : months[b] && !months[b].missing.length ? months[b] : null
  const bar = <div className="chips flex flex-wrap gap-1.5 mb-3 no-print"><span className="text-[11px] text-slate-400 self-center">Bulan:</span>{BULAN.map(x => { const ok = !!months[x] && !months[x].missing.length; return <button key={x} disabled={!ok && x !== bulanAktif} onClick={() => setBln(x === bulanAktif ? '' : x)} className={'fchip' + (b === x ? ' on' : '')} style={{ ['--c' as any]: ok || x === bulanAktif ? '#34d399' : '#64748b' }}>{x}</button> })}</div>
  return { b, bar, md, bulanIdx: BULAN.indexOf(b), loading: !md && status[b]?.state !== 'Gagal Diakses' }
}

const K = 'pln-eta-cmp'
export const readCmp = (): Cmp => { try { const v = +(localStorage.getItem(K) ?? 6); return ([1, 6, 8, 9] as number[]).includes(v) ? v as Cmp : 6 } catch { return 6 } }
/** Pembanding ETA (kolom Tgl.) yang dipakai semua halaman analisis; disimpan per peramban. */
export function useCmp() {
  const [cmp, set] = useState<Cmp>(readCmp)
  const setCmp = (v: Cmp) => { set(v); try { localStorage.setItem(K, String(v)) } catch { /* tanpa penyimpanan */ } }
  const ui = <label className="flex items-center gap-2 text-xs no-print"><span className="text-slate-400">Bandingkan ETA (Tgl.) dengan:</span><select aria-label="Pembanding ETA" value={cmp} onChange={e => setCmp(+e.target.value as Cmp)}>{([6, 1, 8, 9] as Cmp[]).map(k => <option key={k} value={k}>{CMP_LABEL[k]}</option>)}</select></label>
  return { cmp, ui }
}

/** Cakupan bulan untuk halaman yang membaca sheet ALL Shipment (setahun): default = bulan aktif, bisa diganti "Semua bulan". */
export function useScope() {
  const { monthly, bulanAktif } = useStore(); const [scope, setScope] = useState(''); const b = scope === 'ALL' ? '' : scope || bulanAktif
  const ids = new Set((monthly?.ships ?? []).map((s: any) => s.id)); const lb = b.toLowerCase()
  const pick = <T extends { id: string; konfRaw?: string }>(ships: T[]) => b ? ships.filter(s => String(s.konfRaw ?? '').toLowerCase().includes(lb) || (b === bulanAktif && ids.has(s.id))) : ships
  const ui = <label className="flex items-center gap-2 text-xs no-print"><span className="text-slate-400">Bulan:</span><select aria-label="Cakupan bulan" value={scope || bulanAktif} onChange={e => setScope(e.target.value)}>{BULAN.map(x => <option key={x}>{x}</option>)}<option value="ALL">Semua bulan (setahun)</option></select></label>
  return { pick, ui, label: b ? `${b} 2026` : 'Tahun 2026', key: scope + bulanAktif + ids.size }
}
