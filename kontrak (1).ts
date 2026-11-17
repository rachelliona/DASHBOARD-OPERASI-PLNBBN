import { KONTRAK_SEED, KODE_PEMASOK, PLTU_KONTRAK, Cluster, Kontrak } from '../config/kontrak'
import type { Ship } from './monthly'
export type { Cluster, Kontrak }

export const CLUSTERS: Cluster[] = ['LRC', 'MRC', 'HRC']
/** Cluster kalori dari GAR (kcal/kg): di bawah 4.400 LRC, di bawah 5.000 MRC, selebihnya HRC. */
export const clusterOf = (gar: number): Cluster => gar < 4400 ? 'LRC' : gar < 5000 ? 'MRC' : 'HRC'
export const CLUSTER_VAR: Record<Cluster, string> = { LRC: 'var(--lrc)', MRC: 'var(--mrc)', HRC: 'var(--hrc)' }
export const STATUS_LABEL = ['Terkontrak', 'On Progress Kontrak Baru'] as const
let seq = 0
export const newId = () => 'k' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5)
export const seedRows = (): Kontrak[] => KONTRAK_SEED.map(r => ({ id: newId(), no: String(r[0]), pelanggan: r[1], tambang: r[2], gar: r[3], cluster: r[4], vol: r[5], status: r[6] }))

// ---------- pencocokan nama pemasok ----------
const STOP = new Set(['pt', 'cv', 'tbk', 'ud', 'pt.', 'cv.'])
/** Kunci nama: huruf kecil, tanpa badan usaha dan tanda baca. */
export const sKey = (s: string) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9&,; ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).join(' ').replace(/\s*[&,;]\s*/g, ' & ').replace(/(^[ &]+|[ &]+$)/g, '').trim()
/** Nama gabungan ("A & B", "A, B") dipecah menjadi kunci per pemasok. */
export const partsOf = (s: string) => sKey(s).split(/\s*&\s*/).map(x => x.split(/\s+/).filter(w => !STOP.has(w)).join(' ').trim()).filter(Boolean)
function lev(a: string, b: string) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur }
  return prev[n]
}
export const sim = (a: string, b: string) => { const L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 1 }

export type Resolver = { entities: Map<string, string>; entityOfKey: Map<string, string>; resolve: (s: Pick<Ship, 'sumber' | 'mitraReal'>) => { ent: string | null; label: string } }
/** Entitas pemasok = pemasok pertama pada tiap kontrak (kunci nama). alias: label shipment → nama pemasok kontrak (koreksi manual; '-' = abaikan). */
export function buildResolver(kontrak: Kontrak[], alias: Record<string, string> = {}): Resolver {
  const entities = new Map<string, string>(), entityOfKey = new Map<string, string>(), parts = kontrak.map(k => partsOf(k.tambang))
  kontrak.forEach((k, i) => { const p = parts[i][0] ?? sKey(k.tambang); if (p && !entities.has(p)) entities.set(p, k.tambang.split(/\s*(?:&|,)\s*/)[0].replace(/^(PT|CV)\s+/i, '').trim() || k.tambang); if (p) entityOfKey.set(p, p) })
  kontrak.forEach((_, i) => parts[i].slice(1).forEach(x => { if (!entityOfKey.has(x)) entityOfKey.set(x, parts[i][0]) }))
  const keys = [...entityOfKey.keys()]
  const byKey = (raw: string): string | null => {
    const k = sKey(raw); if (!k) return null; const dir = entityOfKey.get(k); if (dir) return dir
    for (const p of partsOf(raw)) { const d = entityOfKey.get(p); if (d) return d }
    let best: { s: number; k: string } | null = null
    for (const p of partsOf(raw)) for (const c of keys) { if (Math.min(p.length, c.length) < 5) continue; const s = sim(p, c); if (s >= 0.82 && (!best || s > best.s)) best = { s, k: c } }
    return best ? entityOfKey.get(best.k)! : null
  }
  const resolve: Resolver['resolve'] = s => {
    const sum = String(s.sumber ?? '').trim(), kode = String(s.mitraReal ?? '').trim(), label = sum || kode
    for (const lb of [sum, kode]) { const a = lb && alias[lb]; if (a === '-') return { ent: null, label }; if (a) { const e = byKey(a); if (e) return { ent: e, label } } }
    const nama = KODE_PEMASOK[kode.toUpperCase()]; if (nama) { const e = byKey(nama); if (e) return { ent: e, label } }
    const e = sum ? byKey(sum) : null; return { ent: e, label }
  }
  return { entities, entityOfKey, resolve }
}

// ---------- alokasi realisasi ke kontrak ----------
export type Real = { bl: number; ds: number; n: number; bln: number[]; blnBl: number[] }
const zero = (): Real => ({ bl: 0, ds: 0, n: 0, bln: Array(12).fill(0), blnBl: Array(12).fill(0) })
const add = (a: Real, b: { bl: number; ds: number }, w: number, m: number | null) => { a.bl += b.bl * w; a.ds += b.ds * w; a.n += w; if (m != null) { a.bln[m] += b.ds * w; a.blnBl[m] += b.bl * w } }
export type Metric = 'ds' | 'bl'
export type Banding = {
  kontrak: (Kontrak & { real: Real; plants: string[]; payung: boolean })[]
  pemasok: { key: string; nama: string; kontrak: number; n: number; real: Real; luar: Real }[]
  tanpaKontrak: { label: string; real: Real }[]
  tanpaNama: Real
  total: { kontrak: number; real: Real; alokasi: Real }
}
const nrm = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const monthOf = (s: Ship): number | null => { for (let i = s.ms.length - 1; i >= 0; i--) { const t = s.ms[i]; if (t != null) { const d = new Date(t); return d.getUTCFullYear() === 2026 ? d.getUTCMonth() : null } } return null }
/** Kontrak vs realisasi: tiap shipment dibagi ke kontrak pemasok yang sama. Prioritas: kontrak khusus PLTU tujuan, lalu kontrak payung; dibagi menurut volume kontrak. Sisanya dicatat sebagai realisasi di luar kontrak PLTU. */
export function banding(kontrak: Kontrak[], ships: Ship[], alias: Record<string, string> = {}, bulanDari: (s: Ship) => number | null = monthOf): Banding {
  const R = buildResolver(kontrak, alias)
  const ks = kontrak.map(k => ({ ...k, real: zero(), plants: (PLTU_KONTRAK[k.pelanggan] ?? []).map(nrm), payung: !(PLTU_KONTRAK[k.pelanggan]?.length) }))
  const entOf = ks.map(k => partsOf(k.tambang)[0] ?? sKey(k.tambang))
  const pem = new Map<string, Banding['pemasok'][number]>(); R.entities.forEach((nama, key) => pem.set(key, { key, nama, kontrak: 0, n: 0, real: zero(), luar: zero() }))
  ks.forEach((k, i) => { const p = pem.get(entOf[i]); if (p) p.kontrak += k.vol })
  const tk = new Map<string, Real>(), tanpaNama = zero(), alokasi = zero(), total = zero()
  ships.forEach(s => {
    const v = { bl: s.bl ?? 0, ds: s.ds ?? 0 }; if (!(v.bl > 0 || v.ds > 0)) return
    const m = bulanDari(s); add(total, v, 1, m)
    const { ent, label } = R.resolve(s)
    if (!label) { add(tanpaNama, v, 1, m); return }
    if (!ent) { const r = tk.get(label) ?? zero(); add(r, v, 1, m); tk.set(label, r); return }
    const p = pem.get(ent)!; add(p.real, v, 1, m); p.n++
    const idx = ks.map((_, i) => i).filter(i => entOf[i] === ent); const pl = nrm(s.plant)
    let cand = idx.filter(i => ks[i].plants.includes(pl)); if (!cand.length) cand = idx.filter(i => ks[i].payung)
    if (!cand.length) { add(p.luar, v, 1, m); return }
    const w = cand.reduce((a, i) => a + (ks[i].vol || 1), 0); cand.forEach(i => add(ks[i].real, v, (ks[i].vol || 1) / w, m)); add(alokasi, v, 1, m)
  })
  const sorted = [...tk].map(([label, real]) => ({ label, real })).sort((a, b) => b.real.ds + b.real.bl - a.real.ds - a.real.bl)
  return { kontrak: ks, pemasok: [...pem.values()].sort((a, b) => b.kontrak - a.kontrak), tanpaKontrak: sorted, tanpaNama, total: { kontrak: kontrak.reduce((a, k) => a + k.vol, 0), real: total, alokasi } }
}

// ---------- impor / ekspor ----------
const num = (s: string) => parseInt(String(s).replace(/\D/g, ''), 10) || 0
/** Tempel dari Excel/Sheets: No, Pelanggan, Pemasok, GAR, Cluster, Volume, Status (dipisah tab). */
export function parsePaste(text: string): Kontrak[] {
  return text.split(/\r?\n/).map(l => l.split('\t')).filter(a => a.length >= 6).map(a => { const gar = num(a[3]), c = (a[4] ?? '').trim().toUpperCase(); return { id: newId(), no: (a[0] ?? '').trim() || '-', pelanggan: a[1].trim(), tambang: a[2].trim(), gar, cluster: (CLUSTERS as string[]).includes(c) ? c as Cluster : clusterOf(gar), vol: num(a[5]), status: /progress/i.test(a[6] ?? '') ? 1 : 0 } as Kontrak }).filter(r => r.gar > 0 && r.vol > 0 && r.pelanggan)
}
export const toCsvRows = (rows: Kontrak[]) => rows.map(r => ({ No: r.no, 'PLTU / Pelanggan': r.pelanggan, 'Sumber tambang (pemasok)': r.tambang, GAR: r.gar, Cluster: r.cluster, 'Volume (MT)': r.vol, Status: STATUS_LABEL[r.status] }))
