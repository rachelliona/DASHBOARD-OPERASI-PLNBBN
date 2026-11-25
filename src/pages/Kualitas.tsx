import { useEffect, useMemo, useState, ReactNode } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { LayoutDashboard, Table2, ShieldAlert, FileText } from 'lucide-react'
import { Btn, Card, Kpi, PageHead } from '../components/ui'
import { useDetail } from '../components/Detail'
import { SOURCES } from '../config/sources'
import { LOKASI_ROWS } from '../config/lokasi'
import { QShip, avg, coaStatus, hariSejak, parseKualitas } from '../domain/kualitas'
import { Std, cariStd, nilai, parseStd } from '../domain/reject'
import { kunci, useDurasi } from '../domain/durasi'
import { todayRef } from '../domain/insight'
import { pdfPemasok, pdfTransport } from '../kualitas/pdf'

export type TabK = 'home' | 'shipment' | 'umpire' | 'evaluasi'
const nf = (n: number | null, d = 0) => n == null ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d })
const fd = (t: number | null) => t == null ? '—' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }).format(t)
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const bk = (t: number | null) => t == null ? '' : new Date(t).toISOString().slice(0, 7)
const bkLabel = (k: string) => BLN[+k.slice(5) - 1] + ' ' + k.slice(2, 4)
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y))
const fetchTxt = (name: string) => fetch(SOURCES.find(s => s.name === name)!.url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(name + ' HTTP ' + r.status); return r.text() })
let cache: Promise<{ ships: QShip[]; std: Std[] }> | null = null
const muat = (force = false) => { if (force) cache = null; return (cache ??= Promise.all([fetchTxt('ALL Shipment').then(parseKualitas), fetchTxt('Standar Rejection').then(parseStd).catch(() => [] as Std[])]).then(([ships, std]) => ({ ships, std })).catch(e => { cache = null; throw e })) }
const LOK = LOKASI_ROWS.map(l => ({ ...l, k: kunci(l.nama) })).filter(l => l.k)
const cariLok = (nama: string) => { const k = kunci(nama); if (!k) return null; return LOK.find(l => l.k === k) || LOK.find(l => l.k.length > 3 && (k.includes(l.k) || l.k.includes(k))) || null }
const warna = (d: number) => { const t = Math.max(0, Math.min(1, d / 250)); return `hsl(${Math.round(55 - 55 * t)},85%,${52 - 8 * t}%)` }
type Vm = QShip & { n: ReturnType<typeof nilai> }

const Sel = ({ label, v, set, opts }: { label: string; v: string; set: (s: string) => void; opts: [string, string][] }) => <label className="text-[11px] text-slate-400 flex flex-col gap-0.5">{label}<select className="inp text-xs" value={v} onChange={e => set(e.target.value)}><option value="">Semua</option>{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></label>
const Lencana = ({ t, c }: { t: string; c: string }) => <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap" style={{ background: c }}>{t}</span>

function Tabel({ rows, today, max = 300, onRow }: { rows: Vm[]; today: number; max?: number; onRow?: (s: Vm) => void }) {
  return <div className="overflow-x-auto"><table className="tbl-si w-full text-xs min-w-[1000px]"><thead><tr><th>Nominasi TB/BG</th><th>Tgl bongkar</th><th>H+</th><th>PLTU</th><th>Mitra</th><th>Sumber tambang</th><th>B/L (MT)</th><th>D/S (MT)</th><th>GCV m→b</th><th>TM m→b</th><th>Ash m→b</th><th>TS m→b</th><th>Status</th></tr></thead><tbody>
    {rows.slice(0, max).map((s, i) => <tr key={i} className={onRow ? 'cursor-pointer' : ''} onClick={() => onRow?.(s)}><td>{s.tbbg || s.si || '—'}</td><td>{fd(s.selesaiBongkar)}</td><td>{hariSejak(s, today) ?? '—'}</td><td>{s.plant}</td><td>{s.mitra || '—'}</td><td>{s.sumber || '—'}</td><td>{nf(s.bl)}</td><td>{nf(s.ds)}</td>
      <td style={{ color: s.turun != null && s.turun > 150 ? '#f87171' : undefined }}>{nf(s.gcvL)} → {nf(s.gcvU)}</td><td>{nf(s.tmL, 2)} → {nf(s.tmU, 2)}</td><td>{nf(s.ashL, 2)} → {nf(s.ashU, 2)}</td><td>{nf(s.tsL, 2)} → {nf(s.tsU, 2)}</td>
      <td>{s.n == null ? <Lencana t="BELUM DINILAI" c="#64748b" /> : s.n.reject ? <Lencana t="REJECT" c="#dc2626" /> : <Lencana t="AMAN" c="#059669" />}</td></tr>)}</tbody></table>
    {rows.length > max && <p className="text-[11px] text-slate-400 mt-2">Menampilkan {max} dari {nf(rows.length)} baris.</p>}{!rows.length && <p className="text-xs text-slate-400">Tidak ada data.</p>}</div>
}
const PARAM: Record<string, { u: keyof QShip; l?: keyof QShip; std?: (d: Std) => number | null; unit: string; d: number }> = {
  GCV: { u: 'gcvU', l: 'gcvL', std: d => d.gcv, unit: 'kcal/kg', d: 0 }, TM: { u: 'tmU', l: 'tmL', std: d => d.tm, unit: '%', d: 2 }, Ash: { u: 'ashU', l: 'ashL', std: d => d.ash, unit: '%', d: 2 }, TS: { u: 'tsU', l: 'tsL', std: d => d.ts, unit: '%', d: 2 }, HGI: { u: 'hgiU', l: 'hgiL', unit: '', d: 0 }, IDT: { u: 'idtU', l: 'idtL', std: d => d.idt, unit: '°C', d: 0 }, 'Susut MT': { u: 'bl', unit: 'MT', d: 0 } }
function Grafik({ ships, std }: { ships: Vm[]; std: Std[] }) {
  const [p, setP] = useState('GCV'); const [sum, setSum] = useState(''); const [plt, setPlt] = useState(''); const [init, setInit] = useState(false)
  const sums = useMemo(() => { const m = new Map<string, number>(); ships.forEach(s => s.sumber && s.gcvU != null && m.set(s.sumber, (m.get(s.sumber) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]) }, [ships])
  useEffect(() => { if (!init && sums.length) { setSum(sums[0][0]); setInit(true) } }, [sums, init])
  const plts = useMemo(() => { const m = new Map<string, number>(); ships.filter(s => !sum || s.sumber === sum).forEach(s => m.set(s.plant, (m.get(s.plant) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]) }, [ships, sum])
  const cfg = PARAM[p]
  const pts = useMemo(() => {
    const raw = ships.filter(s => (!sum || s.sumber === sum) && (!plt || s.plant === plt)).map(s => ({ t: s.selesaiBongkar ?? s.taPltu, u: p === 'Susut MT' ? (s.bl != null && s.ds != null ? s.bl - s.ds : null) : s[cfg.u] as number | null, l: cfg.l ? s[cfg.l] as number | null : null, n: s.tbbg })).filter(x => x.t != null && x.u != null).sort((a, b) => a.t! - b.t!)
    if (sum) return raw.map(x => ({ ...x, lab: `${fd(x.t)} · ${x.n || ''}` }))
    const m = new Map<string, typeof raw>(); raw.forEach(x => m.set(bk(x.t), [...(m.get(bk(x.t)) ?? []), x])) /* tanpa sumber: rata-rata per bulan agar terbaca */
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([k, a]) => ({ t: a[0].t, u: avg(a.map(x => x.u)), l: avg(a.map(x => x.l)), n: '', lab: `${bkLabel(k)} · rata-rata ${a.length} shipment` }))
  }, [ships, sum, plt, p])
  const d = sum ? cariStd(std, sum) : null; const batas = d && cfg.std ? cfg.std(d) : null
  const ys = [...pts.map(x => x.u!), ...pts.map(x => x.l).filter((x): x is number => x != null), ...(batas != null ? [batas] : [])]; const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.1 || 1
  const W = 900, H = 270, T = 26, X = (i: number) => 52 + (pts.length < 2 ? 400 : i * 820 / (pts.length - 1)), Y = (v: number) => T + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - 22)
  const line = (k: 'u' | 'l') => pts.map((x, i) => x[k] != null ? `${X(i)},${Y(x[k]!)}` : '').filter(Boolean).join(' ')
  const area = pts.length > 1 ? `${X(0)},${H - 22} ${line('u')} ${X(pts.length - 1)},${H - 22}` : ''
  const r = pts.length > 120 ? 0 : pts.length > 50 ? 2 : 3.5
  const tick = pts.length ? [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i) : []
  return <Card title="Realisasi Kualitas Batubara dari Sumber Tambang ke PLTU tujuan"><div className="flex flex-wrap gap-2 items-end mb-3">{Object.keys(PARAM).map(k => <button key={k} onClick={() => setP(k)} className={'fchip' + (p === k ? ' on' : '')} style={{ ['--c' as any]: '#e6b457' }}>{k}</button>)}
    <Sel label="Sumber tambang" v={sum} set={s => { setSum(s); setPlt('') }} opts={sums.map(([a, n]) => [a, `${a} (${n})`])} /><Sel label="PLTU tujuan" v={plt} set={setPlt} opts={plts.map(([a, n]) => [a, `${a} (${n})`])} /><span className="text-xs text-slate-400">Σ {pts.length}{!sum ? ' bulan' : ' shipment'}</span></div>
    {!sum && <p className="text-[11px] text-amber-300 mb-1">Semua sumber tambang dicampur, jadi ditampilkan rata-rata per bulan. Pilih satu sumber tambang untuk melihat tiap shipment dan garis batas penolakan.</p>}
    {pts.length ? <svg viewBox={`0 0 ${W} ${H}`} className="w-full"><defs><linearGradient id="kqa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0ea5c6" stopOpacity=".35" /><stop offset="1" stopColor="#0ea5c6" stopOpacity="0" /></linearGradient></defs>
      <text x="4" y="12" fontSize="11" fontWeight="600" fill="#94a3b8">{p} ({cfg.unit})</text>
      {[0, 1, 2, 3].map(i => { const v = lo - pad + (hi - lo + 2 * pad) * i / 3; return <g key={i}><line x1="52" x2={W - 16} y1={Y(v)} y2={Y(v)} stroke="#334155" strokeDasharray="3 4" /><text x="46" y={Y(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{nf(v, cfg.d)}</text></g> })}
      {tick.map(i => <text key={i} x={X(i)} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}>{fd(pts[i].t)}</text>)}
      {area && <polygon points={area} fill="url(#kqa)" />}
      {batas != null && <line x1="52" x2={W - 16} y1={Y(batas)} y2={Y(batas)} stroke="#ef4444" strokeWidth="1.6" strokeDasharray="6 4" />}
      {cfg.l && <polyline points={line('l')} fill="none" stroke="#94a3b8" strokeWidth="1.3" strokeLinejoin="round" opacity=".8" />}<polyline points={line('u')} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((x, i) => <circle key={i} cx={X(i)} cy={Y(x.u!)} r={r || 6} fill={r ? '#0ea5c6' : 'transparent'} stroke={r ? '#0b1626' : 'none'} strokeWidth="1"><title>{`${x.lab} · bongkar ${nf(x.u, cfg.d)}${x.l != null ? ' · muat ' + nf(x.l, cfg.d) : ''}`}</title></circle>)}</svg> : <p className="text-xs text-slate-400">Tidak ada data untuk pilihan ini.</p>}
    <p className="text-[11px] text-slate-400 mt-1"><span style={{ color: '#22d3ee' }}>■</span> bongkar {cfg.l && <><span style={{ color: '#94a3b8' }}>■</span> muat </>}{batas != null && <><span style={{ color: '#ef4444' }}>- -</span> batas penolakan {nf(batas, cfg.d)}</>}</p></Card>
}
export default function Kualitas({ tab }: { tab: TabK }) {
  const [d, setD] = useState<{ ships: QShip[]; std: Std[] } | null>(null); const [err, setErr] = useState(''); const dt = useDetail(); const [cari, setCari] = useState('')
  const [fp, setFp] = useState(''); const [fm, setFm] = useState(''); const [fb, setFb] = useState(''); const [urut, setUrut] = useState('drop'); const [ly, setLy] = useState({ plt: true, muat: true, rute: true })
  const today = todayRef(); const dur = useDurasi()
  useEffect(() => { muat().then(setD).catch(e => setErr(e.message)) }, [])
  const reload = () => { setD(null); setErr(''); muat(true).then(setD).catch(e => setErr(e.message)) }
  const all = useMemo<Vm[]>(() => (d?.ships ?? []).map(s => ({ ...s, n: nilai(s, d!.std) })), [d])
  const fs = useMemo(() => all.filter(s => (!fp || s.plant === fp) && (!fm || s.mitra === fm) && (!fb || bk(s.selesaiBongkar) === fb)), [all, fp, fm, fb])
  const st = useMemo(() => {
    const by = (k: string) => fs.filter(s => coaStatus(s, today) === k); const dengan = fs.filter(s => s.turun != null); const dinilai = fs.filter(s => s.n); const rej = dinilai.filter(s => s.n!.reject)
    const mit = new Map<string, Vm[]>(); dinilai.forEach(s => s.mitra && mit.set(s.mitra, [...(mit.get(s.mitra) ?? []), s])); const mr = [...mit].map(([m, a]) => ({ m, n: a.length, rej: a.filter(s => s.n!.reject).length, ump: a.filter(s => s.n!.umpire).length, drop: avg(a.map(s => s.turun)) })).sort((a, b) => b.rej / b.n - a.rej / a.n || b.n - a.n)
    const pl = new Map<string, Vm[]>(); fs.forEach(s => pl.set(s.plant, [...(pl.get(s.plant) ?? []), s])); const pr = [...pl].map(([p, a]) => ({ p, n: a.length, rej: a.filter(s => s.n?.reject).length, drop: avg(a.map(s => s.turun)), gcv: avg(a.map(s => s.gcvU)) })).filter(x => x.n >= 3 && x.drop != null)
    const ok = mr.filter(x => x.n >= 3)
    return { ada: by('ada'), jend: by('jendela'), telat: by('telat'), belum: by('belum'), dengan, dinilai, rej, aman: dinilai.filter(s => !s.n!.reject), ump: rej.filter(s => s.n!.umpire), mr, best: [...ok].sort((a, b) => a.rej / a.n - b.rej / b.n || (a.drop ?? 0) - (b.drop ?? 0))[0], worst: ok[0], bestP: [...pr].sort((a, b) => a.rej / a.n - b.rej / b.n || a.drop! - b.drop!)[0], avgDrop: avg(dengan.map(s => s.turun)), ready: fs.filter(s => s.selesaiBongkar != null && today >= s.selesaiBongkar - 2 * 864e5), cm: fs.filter(s => s.gcvL != null).length }
  }, [fs, today])
  const sumPlt = useMemo(() => { const m = new Map<string, Vm[]>(); fs.forEach(s => { const k = (s.sumber || '(tidak tercatat)') + '|' + s.plant; m.set(k, [...(m.get(k) ?? []), s]) })
    const r = [...m].map(([k, a]) => { const [sumber, plant] = k.split('|'); const g = avg(a.map(s => s.turun)); const gl = avg(a.map(s => s.gcvL)); const ton = a.reduce((t, s) => t + (s.bl != null && s.ds != null ? s.bl - s.ds : 0), 0); const bl = a.reduce((t, s) => t + (s.bl != null && s.ds != null ? s.bl : 0), 0); const din = a.filter(s => s.n); const rj = din.filter(s => s.n!.reject).length
      return { sumber, plant, a, n: a.length, vol: a.reduce((t, s) => t + (s.ds ?? 0), 0), mitra: uniq(a.map(s => s.mitra)).join(', '), gcv: avg(a.map(s => s.gcvU)), tm: avg(a.map(s => s.tmU)), ash: avg(a.map(s => s.ashU)), ts: avg(a.map(s => s.tsU)), dg: g, pg: g != null && gl ? g / gl * 100 : null, ton, pt: bl ? ton / bl * 100 : null, din: din.length, rj } })
    return r.sort((a, b) => urut === 'drop' ? (b.dg ?? -1e9) - (a.dg ?? -1e9) : urut === 'vol' ? b.vol - a.vol : b.n - a.n) }, [fs, urut])
  const peta = useMemo(() => { const m = new Map<string, Vm[]>(); st.dengan.forEach(s => m.set(s.plant, [...(m.get(s.plant) ?? []), s])); return [...m].map(([p, a]) => ({ p, a, n: a.length, drop: avg(a.map(s => s.turun))!, gl: avg(a.map(s => s.gcvL)), gu: avg(a.map(s => s.gcvU)), lok: cariLok(p) })).sort((x, y) => y.drop - x.drop) }, [st.dengan])
  const muatPts = useMemo(() => { const m = new Map<string, { j: string; a: Vm[]; lok: ReturnType<typeof cariLok> }>(); fs.forEach(s => { if (s.jetty && s.turun != null) { const x = m.get(s.jetty) ?? { j: s.jetty, a: [], lok: cariLok(s.jetty) }; x.a.push(s); m.set(s.jetty, x) } }); return [...m.values()] }, [fs])
  const rutes = useMemo(() => { const m = new Map<string, { a: [number, number]; b: [number, number]; d: number[] }>(); fs.forEach(s => { if (s.jetty && s.turun != null) { const j = cariLok(s.jetty), p = cariLok(s.plant); if (j && p) { const k = j.nama + '>' + p.nama; const x = m.get(k) ?? { a: [j.lat, j.lon], b: [p.lat, p.lon], d: [] }; x.d.push(s.turun); m.set(k, x) } } }); return [...m.values()].map(x => ({ ...x, drop: x.d.reduce((a, b) => a + b, 0) / x.d.length })) }, [fs])
  const [q, setQ] = useState(Math.floor(new Date(today).getUTCMonth() / 3) + 1); const [thn, setThn] = useState(new Date(today).getUTCFullYear())
  const list = useMemo(() => fs.filter(s => (s.gcvL != null || s.gcvU != null || s.bl != null) && (!cari || (s.plant + s.mitra + s.si + s.sumber + s.tbbg).toLowerCase().includes(cari.toLowerCase()))).sort((a, b) => (b.selesaiBongkar ?? 0) - (a.selesaiBongkar ?? 0)), [fs, cari])
  const popup = (t: string, rows: Vm[]) => {
    const sorted = [...rows].sort((a, b) => (b.selesaiBongkar ?? 0) - (a.selesaiBongkar ?? 0)); const din = rows.filter(x => x.n), rj = din.filter(x => x.n!.reject).length
    const pl = new Map<string, number>(); rows.forEach(x => pl.set(x.plant, (pl.get(x.plant) ?? 0) + 1)); const top = [...pl].sort((a, b) => b[1] - a[1]).slice(0, 8)
    dt.open({ variant: 'drawer', title: t, sub: `${nf(rows.length)} shipment · klik di luar panel atau Esc untuk menutup`, color: '#22d3ee',
      stats: [{ l: 'Shipment', v: nf(rows.length) }, { l: 'Volume D/S (MT)', v: nf(rows.reduce((a, x) => a + (x.ds ?? 0), 0)) }, { l: 'Rata-rata susut GCV', v: avg(rows.map(x => x.turun)) == null ? '—' : nf(avg(rows.map(x => x.turun))) + ' kcal/kg' }, { l: 'Reject / dinilai', v: `${nf(rj)} / ${nf(din.length)}`, c: rj ? '#f87171' : undefined }],
      bars: top.length > 1 ? [{ title: 'Shipment per PLTU tujuan', items: top.map(([l, v]) => ({ l, v, c: '#22d3ee' })) }] : undefined,
      table: { head: ['Nominasi TB/BG · Mitra', 'Bongkar', 'PLTU', 'GCV m→b', 'Status'], align: ['l', 'l', 'l', 'r', 'l'], rows: sorted.slice(0, 60).map(x => [`${x.tbbg || x.si || '—'} · ${x.mitra || '—'}`, fd(x.selesaiBongkar), x.plant, `${nf(x.gcvL)} → ${nf(x.gcvU)}`, (x.n == null ? 'Belum dinilai' : x.n.reject ? 'REJECT' : 'Aman') + (x.turun == null ? '' : ' · susut ' + nf(x.turun))]) },
      note: rows.length > 60 ? `Menampilkan 60 terbaru dari ${nf(rows.length)}. Daftar lengkap ada di tab All Shipment.` : undefined, actions: [{ label: 'Buka All Shipment', to: '/kualitas/shipment' }] })
  }
  const detSpec = (x: Vm) => { const sd = x.n?.std ?? (d ? cariStd(d.std, x.sumber) : null); const B = (v: number | null, dd = 0) => v == null ? '—' : nf(v, dd)
    dt.open({ variant: 'modal', title: x.tbbg || x.si || x.plant, sub: `${x.plant} · ${x.mitra || '—'} · ${x.sumber || '—'}`, color: x.n?.reject ? '#f87171' : '#34d399',
      stats: [{ l: 'Penilaian', v: x.n == null ? 'Belum dinilai' : x.n.reject ? 'REJECT' : 'AMAN', c: x.n?.reject ? '#f87171' : x.n ? '#34d399' : undefined }, { l: 'Susut GCV', v: x.turun == null ? '—' : nf(x.turun) + ' kcal/kg' }, { l: 'B/L → D/S (MT)', v: `${nf(x.bl)} → ${nf(x.ds)}` }, { l: 'Selesai bongkar', v: fd(x.selesaiBongkar) }],
      note: x.n?.reject ? 'Reject: ' + x.n.bongkar.map(y => `${y.p} ${nf(y.v, 2)} (batas ${nf(y.batas, 2)})`).join(', ') + (x.n.umpire ? ' · kandidat umpire (muat memenuhi)' : '') : undefined,
      table: { head: ['Parameter', 'Muat', 'Bongkar', 'Batas penolakan'], align: ['l', 'r', 'r', 'r'], rows: [['GCV (kcal/kg)', B(x.gcvL), B(x.gcvU), sd?.gcv != null ? '< ' + nf(sd.gcv) : '—'], ['TM (%)', B(x.tmL, 2), B(x.tmU, 2), sd?.tm != null ? '> ' + nf(sd.tm, 2) : '—'], ['Ash (%)', B(x.ashL, 2), B(x.ashU, 2), sd?.ash != null ? '> ' + nf(sd.ash, 2) : '—'], ['TS (%)', B(x.tsL, 2), B(x.tsU, 2), sd?.ts != null ? '> ' + nf(sd.ts, 2) : '—'], ['HGI', B(x.hgiL), B(x.hgiU), sd?.hgiLo != null ? '< ' + nf(sd.hgiLo) : '—'], ['IDT (°C)', B(x.idtL), B(x.idtU), sd?.idt != null ? '< ' + nf(sd.idt) : '—']] } }) }
  const filt = d && tab !== 'evaluasi' && <div className="flex flex-wrap gap-2 justify-center"><Sel label="PLTU" v={fp} set={setFp} opts={uniq(all.map(s => s.plant)).map(a => [a, a])} /><Sel label="Mitra" v={fm} set={setFm} opts={uniq(all.map(s => s.mitra)).map(a => [a, a])} /><Sel label="Bulan bongkar" v={fb} set={setFb} opts={uniq(all.map(s => bk(s.selesaiBongkar))).map(a => [a, bkLabel(a)])} /></div>
  const alasan = (p: string) => st.rej.filter(s => s.n!.bongkar.some(x => x.p === p))
  return <div className="space-y-4 kq">
    <PageHead title="Monitoring Kualitas Batubara" sub={<>Sumber: sheet ALL Shipment (Monitoring Pasokan DitOperasi PLNBBN 2026) + Standar Rejection · reject = CoA bongkar melewati batas penolakan sumber tambang · CoA bongkar dinilai siap bila terisi, jendela pengisian H-2 s.d. H+7 dari selesai bongkar</>} right={<Btn onClick={reload}>Muat ulang</Btn>} />
    <div className="vsw" role="tablist" aria-label="Pilih tampilan kualitas">{([['home', 'Home', LayoutDashboard], ['shipment', 'All Shipment', Table2], ['umpire', 'Umpire and Rejection', ShieldAlert], ['evaluasi', 'Evaluasi Mitra (PDF)', FileText]] as [TabK, string, any][]).map(([k, l, I]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { location.hash = '#/kualitas/' + k }} className={'vsw-b' + (tab === k ? ' on' : '')}><I size={16} /><span>{l}</span></button>)}</div>
    {err && <Card><p className="text-xs text-amber-300">Gagal memuat data: {err}</p></Card>}{!d && !err && tab !== 'evaluasi' && <Card><p className="text-xs text-slate-400">Memuat data kualitas…</p></Card>}{filt}
    {d && tab === 'home' && <>
      <h3 className="kq-sec">Penilaian mutu (CoA bongkar vs batas penolakan)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Jumlah Shipment" value={nf(fs.length)} note={`${nf(st.cm)} sudah ada CoA muat · ${nf(fs.filter(s => s.gcvU != null).length)} sudah ada CoA bongkar`} accent="#0891b2" onClick={() => popup('Semua shipment', fs)} />
        <Kpi label="Jumlah Shipment Aman" value={nf(st.aman.length)} note={`${nf(st.dinilai.length ? st.aman.length / st.dinilai.length * 100 : null)}% dari ${nf(st.dinilai.length)} dinilai`} accent="#059669" onClick={() => popup('Shipment aman', st.aman)} />
        <Kpi label="Jumlah Shipment Reject" value={nf(st.rej.length)} note={`${nf(st.dinilai.length ? st.rej.length / st.dinilai.length * 100 : null)}% dari ${nf(st.dinilai.length)} dinilai`} accent="#dc2626" onClick={() => popup('Shipment reject', st.rej)} />
        <Kpi label="Kandidat Umpire" value={nf(st.ump.length)} note="muat memenuhi, bongkar reject" accent="#2563eb" onClick={() => popup('Kandidat umpire', st.ump)} />
      </div>
      <h3 className="kq-sec">Status CoA bongkar (jendela H-2 s.d. H+7 dari selesai bongkar)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="CoA bongkar sudah ada" value={nf(st.ada.length)} note={`dari ${nf(st.ready.length)} yang sudah mencapai H-2 selesai bongkar`} accent="#34d399" onClick={() => popup('CoA bongkar sudah ada', st.ada)} />
        <Kpi label="Menunggu CoA (H-2…H+7)" value={nf(st.jend.length)} note="masih dalam jendela" accent="#fbbf24" onClick={() => popup('Menunggu CoA bongkar (H-2 s.d. H+7)', st.jend)} />
        <Kpi label="CoA telat (> H+7)" value={nf(st.telat.length)} note="lewat jendela, belum terisi" accent="#f87171" onClick={() => popup('CoA bongkar telat (> H+7)', st.telat)} />
        <Kpi label="Belum ada standar" value={nf(fs.filter(s => s.gcvU != null && !s.n).length)} note="CoA bongkar ada, sumber tak ada di Standar Rejection" accent="#64748b" onClick={() => popup('Belum dinilai', fs.filter(s => s.gcvU != null && !s.n))} />
      </div>
      <h3 className="kq-sec">Susut GCV &amp; peringkat</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Rata-rata susut GCV" value={nf(st.avgDrop)} unit="kcal/kg" note={`dari ${nf(st.dengan.length)} shipment`} accent="#fb7185" onClick={() => popup('Susut GCV terbesar', [...st.dengan].sort((a, b) => b.turun! - a.turun!))} />
        <Kpi label="Mitra kualitas terbaik" value={st.best?.m ?? '—'} note={st.best ? `${st.best.rej} reject dari ${st.best.n} shipment, susut ${nf(st.best.drop)} kcal` : 'min. 3 shipment dinilai'} accent="#16a34a" onClick={st.best ? () => popup('Mitra ' + st.best!.m, st.dinilai.filter(s => s.mitra === st.best!.m)) : undefined} />
        <Kpi label="Mitra kualitas terendah" value={st.worst?.m ?? '—'} note={st.worst ? `${st.worst.rej} reject dari ${st.worst.n} shipment, susut ${nf(st.worst.drop)} kcal` : 'min. 3 shipment dinilai'} accent="#b91c1c" onClick={st.worst ? () => popup('Mitra ' + st.worst!.m, st.dinilai.filter(s => s.mitra === st.worst!.m)) : undefined} />
        <Kpi label="PLTU kualitas terbaik" value={st.bestP?.p ?? '—'} note={st.bestP ? `${st.bestP.rej} reject dari ${st.bestP.n}, susut ${nf(st.bestP.drop)} kcal` : 'min. 3 shipment'} accent="#15803d" onClick={st.bestP ? () => popup(st.bestP!.p, fs.filter(s => s.plant === st.bestP!.p)) : undefined} />
      </div>
      <Card title="Peta Operasional (susut GCV muat → bongkar)"><div className="flex flex-wrap gap-3 text-xs mb-2">{([['plt', 'PLTU (warna = susut)'], ['muat', 'Pelabuhan muat'], ['rute', 'Rute']] as const).map(([k, l]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={ly[k]} onChange={e => setLy({ ...ly, [k]: e.target.checked })} />{l}</label>)}</div>
        <p className="text-[11px] text-slate-400 mb-2">Makin merah &amp; besar = susut makin besar (merah penuh ≥ 250 kcal/kg). {peta.filter(p => p.lok).length} PLTU tampil, {peta.filter(p => !p.lok).length} belum punya koordinat{peta.some(p => !p.lok) ? ': ' + peta.filter(p => !p.lok).map(p => p.p).slice(0, 8).join(', ') : ''}. {rutes.length} rute tergambar.</p>
        <div className="h-[60vh] min-h-[340px] rounded-xl overflow-hidden border border-white/10"><MapContainer bounds={[[-11.5, 94], [6.5, 141.5]]} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {ly.rute && rutes.map((r, i) => <Polyline key={i} positions={[r.a, r.b]} pathOptions={{ color: warna(r.drop), weight: 2, opacity: 0.6 }} />)}
          {ly.muat && muatPts.filter(m => m.lok).map(m => <CircleMarker key={m.j} center={[m.lok!.lat, m.lok!.lon]} radius={5} pathOptions={{ color: '#7c2d12', weight: 1, fillColor: '#fb923c', fillOpacity: 0.9 }} eventHandlers={{ click: () => popup('Pelabuhan muat ' + m.j, m.a) }}><Tooltip>{m.j} · {m.a.length} shipment</Tooltip></CircleMarker>)}
          {ly.plt && peta.filter(p => p.lok).map(p => <CircleMarker key={p.p} center={[p.lok!.lat, p.lok!.lon]} radius={6 + Math.min(18, Math.max(0, p.drop) / 12)} pathOptions={{ color: '#111', weight: 1, fillColor: warna(p.drop), fillOpacity: 0.85 }} eventHandlers={{ click: () => popup(`${p.p} · susut rata-rata ${nf(p.drop)} kcal/kg`, p.a) }}><Tooltip>{p.p} · muat {nf(p.gl)} → bongkar {nf(p.gu)} · susut {nf(p.drop)} kcal/kg · {p.n} shipment</Tooltip></CircleMarker>)}</MapContainer></div></Card>
      <Card title="Sumber Tambang ke PLTU" right={<select className="inp text-xs" value={urut} onChange={e => setUrut(e.target.value)}><option value="drop">Penurunan GCV, tertinggi ke terendah</option><option value="vol">Volume D/S terbesar</option><option value="n">Shipment terbanyak</option></select>}>
        <div className="overflow-x-auto"><table className="tbl-si w-full text-xs min-w-[1050px]"><thead><tr><th>Sumber tambang</th><th>PLTU</th><th>Shipment</th><th>Volume D/S (MT)</th><th>GCV</th><th>TM %</th><th>Ash %</th><th>TS %</th><th>Susut GCV (kcal/kg)</th><th>Susut tonase (B/L→D/S)</th><th>Rekomendasi</th><th>Status</th></tr></thead><tbody>
          {sumPlt.slice(0, 60).map(r => <tr key={r.sumber + r.plant} className="cursor-pointer" onClick={() => popup(`${r.sumber} → ${r.plant}`, r.a)}><td>{r.sumber}<div className="text-[10px] text-slate-500">Mitra: {r.mitra || '—'}</div></td><td>{r.plant}</td><td>{r.n}</td><td>{nf(r.vol)}</td><td>{nf(r.gcv)}</td><td>{nf(r.tm, 2)}</td><td>{nf(r.ash, 2)}</td><td>{nf(r.ts, 2)}</td>
            <td>{r.dg == null ? '—' : <><b style={{ color: r.dg > 100 ? '#f87171' : undefined }}>{nf(r.dg)} ({nf(r.pg, 1)}%)</b><div className="h-1.5 rounded bg-white/10 mt-1"><div className="h-1.5 rounded" style={{ width: Math.min(100, Math.max(3, r.dg / 4)) + '%', background: warna(r.dg) }} /></div></>}</td>
            <td>{r.ton > 0 ? `${nf(r.ton)} MT (${nf(r.pt, 2)}%)` : r.ton < 0 ? `naik ${nf(-r.ton)} MT` : '—'}</td><td>{r.dg == null ? <Lencana t="BELUM DINILAI" c="#64748b" /> : r.dg > 100 || r.rj > 0 ? <Lencana t="TIDAK DIREKOMENDASIKAN" c="#dc2626" /> : <Lencana t="DIREKOMENDASIKAN" c="#059669" />}</td>
            <td>{r.din === 0 ? <Lencana t="BELUM DINILAI" c="#64748b" /> : r.rj ? <><Lencana t="REJECT" c="#dc2626" /><div className="text-[10px] text-slate-500">{r.rj} dari {r.din} shipment</div></> : <><Lencana t="AMAN" c="#059669" /><div className="text-[10px] text-slate-500">{r.din} dari {r.din} shipment</div></>}</td></tr>)}</tbody></table></div>
        <p className="text-[11px] text-slate-400 mt-2">Rekomendasi (aturan dashboard ini): tidak direkomendasikan bila ada reject atau susut GCV rata-rata &gt; 100 kcal/kg. Klik baris untuk detail.</p></Card>
      <Grafik ships={fs} std={d.std} /></>}
    {d && tab === 'shipment' && <Card title="Daftar Pengiriman" right={<input className="inp text-xs" placeholder="Cari PLTU / mitra / SI / TB-BG" value={cari} onChange={e => setCari(e.target.value)} />}><p className="text-[11px] text-slate-400 mb-2">Klik baris untuk melihat detail.</p><Tabel rows={list} today={today} onRow={detSpec} /></Card>}
    {d && tab === 'umpire' && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Shipment Reject" value={nf(st.rej.length)} note={`${nf(st.dinilai.length ? st.rej.length / st.dinilai.length * 100 : null, 1)}% dari ${nf(st.dinilai.length)} yang dinilai`} accent="#dc2626" onClick={() => popup('Shipment reject', st.rej)} />
        <Kpi label="Kandidat Umpire" value={nf(st.ump.length)} note="muat memenuhi, bongkar reject" accent="#2563eb" onClick={() => popup('Kandidat umpire', st.ump)} />
        <Kpi label="Tonase Reject (MT D/S)" value={nf(st.rej.reduce((t, s) => t + (s.ds ?? 0), 0))} note="total shipment reject" accent="#0891b2" onClick={() => popup('Shipment reject', st.rej)} />
        {['GCV (GAR)', 'Total moisture', 'Ash', 'Total sulfur'].map(p => <Kpi key={p} label={'Reject karena ' + p} value={nf(alasan(p).length)} note="shipment" accent="#0e7490" onClick={() => popup('Reject karena ' + p, alasan(p))} />)}</div>
      <div className="grid lg:grid-cols-3 gap-3"><Card title="Reject per Mitra"><div className="overflow-x-auto"><table className="tbl-si w-full text-xs"><thead><tr><th>Mitra</th><th>Dinilai</th><th>Reject</th><th>Reject %</th><th>Kandidat umpire</th></tr></thead><tbody>{st.mr.map(m => <tr key={m.m} className="cursor-pointer" onClick={() => popup('Reject mitra ' + m.m, st.rej.filter(s => s.mitra === m.m))}><td><b>{m.m}</b></td><td>{m.n}</td><td>{m.rej}</td><td>{nf(m.rej / m.n * 100)}%</td><td>{m.ump}</td></tr>)}</tbody></table></div></Card>
        <div className="lg:col-span-2"><Card title="Daftar Reject"><div className="overflow-x-auto"><table className="tbl-si w-full text-xs"><thead><tr><th>Nominasi TB/BG</th><th>Tgl bongkar</th><th>PLTU</th><th>Mitra</th><th>Parameter reject</th></tr></thead><tbody>{[...st.rej].sort((a, b) => (b.selesaiBongkar ?? 0) - (a.selesaiBongkar ?? 0)).slice(0, 300).map((s, i) => <tr key={i} className="cursor-pointer" onClick={() => detSpec(s)}><td>{s.tbbg || s.si}</td><td>{fd(s.selesaiBongkar)}</td><td>{s.plant}</td><td>{s.mitra}</td><td>{s.n!.bongkar.map(x => `${x.p} ${nf(x.v, 2)} (batas ${nf(x.batas, 2)})`).join(', ')}</td></tr>)}</tbody></table></div></Card></div></div></>}
    {tab === 'evaluasi' && <Card title="Evaluasi Kinerja Mitra (PDF)">
      <p className="text-xs text-slate-400 mb-3">Format mengikuti formulir Excel: Mitra Transport (data DURASI BBN-BAG: ETA rencana vs realisasi, shortage) dan Mitra Pemasok batubara (ALL Shipment: volume DS, kualitas bongkar, score, kategori). Tanda tangan: Catur Aji Nugroho &amp; Rully Indra.</p>
      <div className="flex flex-wrap gap-2 items-center mb-3"><label className="text-xs">Triwulan <select className="inp" value={q} onChange={e => setQ(+e.target.value)}>{[1, 2, 3, 4].map(i => <option key={i} value={i}>TW {i}</option>)}</select></label><label className="text-xs">Tahun <input className="inp w-20" type="number" value={thn} onChange={e => setThn(+e.target.value)} /></label></div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="gcard"><h3 className="gcard-t mb-1">Mitra Transport</h3><p className="text-xs text-slate-400 mb-2">{dur.rows ? `${nf(dur.rows.length)} shipment terbaca dari sheet durasi` : dur.err ? 'Gagal memuat: ' + dur.err : 'Memuat data durasi…'}</p><Btn disabled={!dur.rows} onClick={() => pdfTransport(dur.rows!, q, thn).doc.save(`Evaluasi-Mitra-Transport-TW${q}-${thn}.pdf`)}>⬇ Unduh PDF Mitra Transport</Btn></div>
        <div className="gcard"><h3 className="gcard-t mb-1">Mitra Batubara (Pemasok)</h3><p className="text-xs text-slate-400 mb-2">{d ? `${nf(all.length)} shipment terbaca dari ALL Shipment` : err ? 'Gagal memuat' : 'Memuat…'}</p><Btn disabled={!d} onClick={() => pdfPemasok(d!.ships, q, thn).doc.save(`Evaluasi-Mitra-Pemasok-TW${q}-${thn}.pdf`)}>⬇ Unduh PDF Mitra Batubara</Btn></div></div></Card>}
  </div>
}
