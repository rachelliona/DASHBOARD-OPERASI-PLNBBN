import { useEffect, useRef, useState } from 'react'
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** Angka naik perlahan dari 0 ke nilai akhir (mati bila pengguna memilih kurangi gerakan). */
export function useCountUp(to: number | null | undefined, ms = 1100) {
  const [v, setV] = useState(0); const from = useRef(0)
  useEffect(() => {
    const t = to ?? 0; if (reduced() || typeof requestAnimationFrame === 'undefined') { setV(t); return }
    const a = from.current, t0 = performance.now(); let raf = 0
    const step = (n: number) => { const k = Math.min(1, (n - t0) / ms), e = 1 - Math.pow(1 - k, 3); setV(a + (t - a) * e); if (k < 1) raf = requestAnimationFrame(step); else from.current = t }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return v
}
/** true setelah render pertama, supaya lebar batang bisa beranimasi dari 0. */
export function useMounted() { const [m, setM] = useState(false); useEffect(() => { const id = setTimeout(() => setM(true), 30); return () => clearTimeout(id) }, []); return m }
/** Alat ukur melingkar besar untuk persentase pemenuhan. */
export function Gauge({ value, color, label }: { value: number | null; color: string; label: string }) {
  const m = useMounted(), shown = useCountUp(value), R = 78, C = 2 * Math.PI * R, pct = Math.max(0, Math.min(100, value ?? 0))
  return <div className="gauge" role="img" aria-label={`${label} ${value == null ? 'tidak tersedia' : value.toFixed(1) + ' persen'}`}>
    <svg viewBox="0 0 200 200"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor={color} /></linearGradient><filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <circle className="g-spin" cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" strokeDasharray="2 7" />
      <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
      <circle cx="100" cy="100" r={R} fill="none" stroke="url(#gg)" strokeWidth="14" strokeLinecap="round" transform="rotate(-90 100 100)" strokeDasharray={C} strokeDashoffset={m ? C * (1 - pct / 100) : C} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 8px ' + color + ')' }} />
      {[0, 25, 50, 75].map(t => { const a = (t / 100) * 2 * Math.PI - Math.PI / 2; return <line key={t} x1={100 + 62 * Math.cos(a)} y1={100 + 62 * Math.sin(a)} x2={100 + 66 * Math.cos(a)} y2={100 + 66 * Math.sin(a)} stroke="rgba(255,255,255,.25)" /> })}</svg>
    <div className="g-in"><div className="g-num num" style={{ color }}>{value == null ? '—' : shown.toFixed(1).replace('.', ',')}<span>%</span></div><div className="g-lbl">{label}</div></div></div>
}
/** Batang tumpuk: lintasan = kebutuhan, arsir = sudah muat (B/L), isi = sudah bongkar (D/S). */
export function Layer({ keb, bl, ds, scale, color, dim }: { keb: number; bl: number; ds: number; scale: number; color: string; dim?: boolean }) {
  const m = useMounted(), w = Math.max(3, Math.min(100, (keb / Math.max(1, scale)) * 100)), f = keb > 0 ? Math.min(100, (ds / keb) * 100) : 0, b = keb > 0 ? Math.min(100, (bl / keb) * 100) : 0
  return <div className="lay" style={{ width: w + '%', opacity: dim ? .35 : 1 }}><i className="lay-bl" style={{ width: m ? b + '%' : 0 }} /><i className="lay-ds" style={{ width: m ? f + '%' : 0, background: `linear-gradient(90deg,${color}99,${color})`, boxShadow: `0 0 12px ${color}88` }} />{ds > keb && keb > 0 && <b className="lay-over" title="Unloading melebihi kebutuhan">+</b>}</div>
}
/** Donat interaktif: potongan menyala saat disorot, bagian tengah menampilkan rincian, daftar di bawah bisa diklik. */
export function Donut({ data, active, onPick, fmt }: { data: { key: string; label: string; color: string; vol: number; n: number }[]; active: string; onPick: (k: string) => void; fmt: (n: number) => string }) {
  const m = useMounted(), [hov, setHov] = useState(''), total = data.reduce((a, d) => a + d.vol, 0), R = 78, C = 2 * Math.PI * R, gap = 5
  const shown = useCountUp(total, 1200); let acc = 0
  const cur = data.find(d => d.key === (hov || active)), pc = (v: number) => (total ? (v / total) * 100 : 0)
  const segs = data.filter(d => d.vol > 0).map(d => { const l = Math.max(2, (d.vol / Math.max(1, total)) * C - gap), s = acc; acc += (d.vol / Math.max(1, total)) * C; return { ...d, l, s } })
  return <div className="donut">
    <div className="donut-svg"><svg viewBox="0 0 220 220" role="img" aria-label="Komposisi volume per tahapan">
      <circle className="g-spin" cx="110" cy="110" r="104" fill="none" stroke="rgba(255,255,255,.14)" strokeDasharray="2 7" />
      <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="26" />
      <g transform="rotate(-90 110 110)">{segs.map(g => { const on = (hov || active) === g.key, dim = (hov || active) && !on
        return <circle key={g.key} cx="110" cy="110" r={R} fill="none" stroke={g.color} strokeLinecap="round" strokeWidth={on ? 32 : 24} strokeDasharray={m ? `${g.l} ${C - g.l}` : `0 ${C}`} strokeDashoffset={-g.s - gap / 2}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1), stroke-width .2s, opacity .2s', opacity: dim ? 0.3 : 1, filter: on ? `drop-shadow(0 0 10px ${g.color})` : undefined, cursor: 'pointer' }}
          onMouseEnter={() => setHov(g.key)} onMouseLeave={() => setHov('')} onClick={() => onPick(g.key)}><title>{g.label}: {fmt(g.vol)} MT</title></circle> })}</g></svg>
      <div className="donut-c">{cur ? <><div className="text-[10px] tracking-widest uppercase" style={{ color: cur.color }}>{cur.label}</div><div className="num font-bold text-xl">{fmt(Math.round(cur.vol))}<span className="text-[10px] font-normal text-slate-400"> MT</span></div><div className="text-[11px] text-slate-400">{pc(cur.vol).toFixed(1).replace('.', ',')}% · {cur.n} shipment</div></>
        : <><div className="text-[10px] tracking-widest uppercase text-slate-400">Total volume</div><div className="num font-bold text-xl">{fmt(Math.round(shown))}<span className="text-[10px] font-normal text-slate-400"> MT</span></div><div className="text-[11px] text-slate-400">{data.reduce((a, d) => a + d.n, 0)} shipment</div></>}</div></div>
    <ul className="donut-l">{data.map(d => { const on = (hov || active) === d.key; return <li key={d.key}><button className={'dl ' + (on ? 'on' : '')} onMouseEnter={() => setHov(d.key)} onMouseLeave={() => setHov('')} onClick={() => onPick(d.key)} aria-pressed={active === d.key}>
      <i style={{ background: d.color, boxShadow: on ? `0 0 10px ${d.color}` : undefined }} /><span className="dl-n">{d.label}</span><span className="dl-v num">{fmt(d.vol)}</span><span className="dl-p num" style={{ color: d.color }}>{pc(d.vol).toFixed(0)}%</span><em><u style={{ width: m ? pc(d.vol) + '%' : 0, background: d.color }} /></em></button></li> })}</ul>
  </div>
}
/** Kartu angka: ikon, angka menghitung naik, dan cincin kecil porsinya terhadap kebutuhan. */
export function StatTile({ icon: I, label, value, unit, share, shareLabel, color, tip }: { icon: any; label: string; value: number; unit?: string; share: number | null; shareLabel: string; color: string; tip?: string }) {
  const n = useCountUp(value), m = useMounted(), R = 19, C = 2 * Math.PI * R, p = Math.max(0, Math.min(100, share ?? 0))
  return <div className="stile" title={tip} style={{ ['--c' as any]: color }}><I className="stile-wm" size={86} aria-hidden />
    <div className="flex items-start gap-3"><div className="stile-ic"><I size={18} /></div><div className="min-w-0 flex-1"><div className="text-[11px] text-slate-300 leading-tight">{label}</div><div className="stile-v num">{Math.round(n).toLocaleString('id-ID')}<small>{unit}</small></div></div>
      <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0" aria-label={`${shareLabel} ${p.toFixed(0)} persen`}><circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" /><circle cx="24" cy="24" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" transform="rotate(-90 24 24)" strokeDasharray={C} strokeDashoffset={m ? C * (1 - Math.min(1, p / 100)) : C} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 4px ${color})` }} /><text x="24" y="27.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{share == null ? '—' : p.toFixed(0) + '%'}</text></svg></div>
    <div className="text-[10px] text-slate-400 mt-1.5">{shareLabel}</div></div>
}
