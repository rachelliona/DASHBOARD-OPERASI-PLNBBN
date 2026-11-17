import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Cluster, CLUSTER_VAR, CLUSTERS } from '../domain/kontrak'
import { fmtNum } from '../domain/format'

export const shortMT = (v: number) => v >= 1e6 ? (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt' : v >= 1e3 ? Math.round(v / 1e3).toLocaleString('id-ID') + ' rb' : String(Math.round(v))
export const ClusterTag = ({ c }: { c: Cluster }) => <span className="ktag" style={{ ['--kc' as any]: CLUSTER_VAR[c] }}>{c}</span>

export function KTabs() {
  const T: [string, string][] = [['/kontrak', 'Portofolio'], ['/kontrak/banding', 'Kontrak vs Realisasi'], ['/kontrak/data', 'Data kontrak']]
  return <nav className="ktabs no-print" aria-label="Bagian kontrak">{T.map(([to, l]) => <NavLink key={to} to={to} end className={({ isActive }) => 'ktab' + (isActive ? ' on' : '')}>{l}</NavLink>)}</nav>
}

/** Donut cluster. onPick dipanggil dengan kunci irisan. */
export function Donut({ items, center, sub, onPick, active }: { items: { k: string; v: number; c: string; label?: string }[]; center: string; sub: string; onPick?: (k: string) => void; active?: string }) {
  const t = items.reduce((a, i) => a + i.v, 0) || 1; let a = -Math.PI / 2; const R = 70, r0 = 48, P = (x: number, rr: number) => [100 + rr * Math.cos(x), 100 + rr * Math.sin(x)]
  return <div className="flex flex-wrap items-center justify-center gap-4">
    <svg viewBox="0 0 200 200" width="180" role="img" aria-label="Komposisi">{items.filter(i => i.v > 0).map(i => { const f = i.v / t, b = a + f * 2 * Math.PI - (f < .999 ? .03 : 0), big = f > .5 ? 1 : 0; const [x1, y1] = P(a, R), [x2, y2] = P(b, R), [x3, y3] = P(b, r0), [x4, y4] = P(a, r0); a += f * 2 * Math.PI
      const on = !active || active === i.k
      return f > .999 ? <circle key={i.k} cx="100" cy="100" r={(R + r0) / 2} fill="none" stroke={i.c} strokeWidth={R - r0} /> : <path key={i.k} d={`M${x1} ${y1}A${R} ${R} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${big} 0 ${x4} ${y4}Z`} fill={i.c} opacity={on ? 1 : .3} style={{ cursor: onPick ? 'pointer' : undefined, transition: 'opacity .2s' }} onClick={() => onPick?.(i.k)}><title>{i.label ?? i.k}</title></path> })}
      <text x="100" y="98" textAnchor="middle" style={{ font: '700 17px Inter Variable,Inter,sans-serif', fill: 'var(--text)' }}>{center}</text><text x="100" y="115" textAnchor="middle" style={{ font: '11px Inter Variable,Inter,sans-serif', fill: 'rgba(var(--ink),.55)' }}>{sub}</text></svg>
    <ul className="text-[13px] space-y-1.5 min-w-[150px]">{items.map(i => <li key={i.k}><button type="button" className="kleg" onClick={() => onPick?.(i.k)} style={{ opacity: !active || active === i.k ? 1 : .45 }}><i style={{ background: i.c }} />{i.label ?? i.k}<b>{shortMT(i.v)} · {(i.v / t * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%</b></button></li>)}</ul>
  </div>
}

/** Batang vertikal per nilai GAR. */
export function GarBars({ rows, onPick }: { rows: { gar: number; v: number; c: Cluster }[]; onPick?: (gar: number) => void }) {
  const mx = Math.max(...rows.map(r => r.v), 1), W = Math.max(300, rows.length * 44), H = 190
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: W }} role="img" aria-label="Volume per GAR">{rows.map((r, i) => { const h = r.v / mx * 130, X = i * 44 + 8
    return <g key={r.gar} style={{ cursor: onPick ? 'pointer' : undefined }} onClick={() => onPick?.(r.gar)}><rect x={X} y={150 - h} width="30" height={Math.max(2, h)} rx="4" fill={CLUSTER_VAR[r.c]} opacity=".88"><title>{`GAR ${r.gar} · ${fmtNum(r.v)} MT`}</title></rect><text x={X + 15} y="168" textAnchor="middle" className="ktx">{r.gar}</text><text x={X + 15} y={144 - h} textAnchor="middle" className="ktx2">{shortMT(r.v)}</text></g> })}</svg></div>
}

/** Peta kontrak: GAR terhadap volume (skala log). Titik transparan = masih on progress kontrak baru. */
export function Scatter({ rows, onPick }: { rows: { id: string; label: string; gar: number; vol: number; c: Cluster; open: boolean }[]; onPick?: (id: string) => void }) {
  const W = 900, H = 300, L = 56, B = 36, lo = 3.6, hi = Math.max(7.2, Math.ceil(Math.log10(Math.max(...rows.map(r => r.vol), 1e7)) + .05))
  const lx = (g: number) => L + (g - 3600) / (5800 - 3600) * (W - L - 20), ly = (v: number) => H - B - (Math.log10(Math.max(v, 1)) - lo) / (hi - lo) * (H - B - 16)
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640 }} role="img" aria-label="Sebaran kontrak: GAR terhadap volume">
    {[4000, 4500, 5000, 5500].map(g => <g key={g}><line x1={lx(g)} x2={lx(g)} y1="10" y2={H - B} className="kgrid" /><text x={lx(g)} y={H - 12} textAnchor="middle" className="ktx">GAR {g}</text></g>)}
    {[1e4, 1e5, 1e6, 1e7].filter(v => Math.log10(v) <= hi).map(v => <g key={v}><line x1={L} x2={W - 10} y1={ly(v)} y2={ly(v)} className="kgrid" /><text x={L - 6} y={ly(v) + 4} textAnchor="end" className="ktx">{shortMT(v)}</text></g>)}
    {rows.map((r, i) => <circle key={r.id} cx={lx(r.gar) + ((i * 7) % 11 - 5)} cy={ly(r.vol)} r={r.open ? 7 : 5} fill={CLUSTER_VAR[r.c]} fillOpacity={r.open ? .15 : .75} stroke={CLUSTER_VAR[r.c]} strokeWidth={r.open ? 2 : 1} style={{ cursor: onPick ? 'pointer' : undefined }} onClick={() => onPick?.(r.id)}><title>{`${r.label} · GAR ${r.gar} · ${fmtNum(r.vol)} MT`}</title></circle>)}
  </svg></div>
}

/** Cincin kemajuan (realisasi ÷ kontrak). Lebih dari 100% memakai warna kuning dan penanda. */
export function Ring({ pct, color, size = 96, label }: { pct: number | null; color: string; size?: number; label?: ReactNode }) {
  const r = 38, C = 2 * Math.PI * r, p = Math.min(100, Math.max(0, pct ?? 0)), over = (pct ?? 0) > 100
  return <div className="kring" style={{ width: size, height: size }}><svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={pct == null ? 'Tidak ada data' : `${pct.toFixed(1)} persen`}><circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="kring-bg" /><circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke={over ? '#fbbf24' : color} strokeDasharray={`${C * p / 100} ${C}`} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray .7s' }} /></svg><div className="kring-t">{label ?? (pct == null ? '—' : <><b>{pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</b><span>%</span></>)}</div></div>
}

/** Baris kemajuan: kontrak vs realisasi. */
export function Bullet({ name, sub, kontrak, real, color, onClick, tag }: { name: string; sub?: string; kontrak: number; real: number; color: string; onClick?: () => void; tag?: ReactNode }) {
  const pct = kontrak > 0 ? real / kontrak * 100 : null, over = (pct ?? 0) > 100, sisa = kontrak - real
  return <button type="button" className="kb" onClick={onClick} disabled={!onClick}>
    <div className="kb-n"><div className="kb-nm" title={name}>{name}{tag}</div>{sub && <div className="kb-sub">{sub}</div>}</div>
    <div className="kb-m"><div className="kb-t"><div className="kb-f" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: over ? 'linear-gradient(90deg,#34d399,#fbbf24)' : `linear-gradient(90deg,${color},color-mix(in srgb,${color} 55%,#fff))` }} />{over && <span className="kb-over">▲</span>}</div>
      <div className="kb-v"><b>{pct == null ? '—' : pct.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'}</b><span>{shortMT(real)} dari {shortMT(kontrak)} MT</span><span className={sisa < 0 ? 'kb-neg' : ''}>{sisa < 0 ? 'lebih ' + shortMT(-sisa) : 'sisa ' + shortMT(sisa)}</span></div></div>
  </button>
}
export { CLUSTERS }

export type SbsItem = { key: string; name: string; sub?: string; kontrak: number; real: number; color: string; onClick?: () => void }
/** Kontrak dan realisasi berdampingan (satu skala) per baris. */
export function SideBySide({ items, mk }: { items: SbsItem[]; mk: string }) {
  const mx = Math.max(1, ...items.flatMap(i => [i.kontrak, i.real]))
  return <div className="sbs" role="list">
    <div className="sbs-lg" aria-hidden><span><i style={{ background: 'rgba(var(--ink),.28)' }} />Volume kontrak</span><span><i style={{ background: '#34d399' }} />Realisasi {mk}</span><span><i style={{ background: '#fbbf24' }} />Melebihi kontrak</span></div>
    {items.map(i => { const pct = i.kontrak > 0 ? i.real / i.kontrak * 100 : null, sisa = i.kontrak - i.real, over = sisa < 0
      return <button type="button" role="listitem" key={i.key} className="sbs-r" onClick={i.onClick} disabled={!i.onClick}>
        <div className="sbs-n"><div className="sbs-nm" title={i.name}>{i.name}</div>{i.sub && <div className="kb-sub">{i.sub}</div>}</div>
        <div className="sbs-b">
          <div className="sbs-l"><div className="sbs-t"><div className="sbs-f" style={{ width: `${i.kontrak / mx * 100}%`, background: 'rgba(var(--ink),.26)' }} /></div><span><em>Kontrak</em><b>{shortMT(i.kontrak)} MT</b></span></div>
          <div className="sbs-l"><div className="sbs-t"><div className="sbs-f" style={{ width: `${i.real / mx * 100}%`, background: over ? 'linear-gradient(90deg,#34d399,#fbbf24)' : `linear-gradient(90deg,${i.color},color-mix(in srgb,${i.color} 60%,#fff))` }} /></div><span><em>Realisasi</em><b>{shortMT(i.real)} MT</b></span></div>
        </div>
        <div className="sbs-p"><b style={{ color: over ? '#fbbf24' : undefined }}>{pct == null ? '—' : pct.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'}</b><span className={over ? 'kb-neg' : ''}>{over ? 'lebih ' + shortMT(-sisa) : 'belum ' + shortMT(sisa)}</span></div>
      </button> })}
  </div>
}
