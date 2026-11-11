import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'

/** Popup detail yang dipakai di semua halaman: klik kartu/grafik/batang → ringkasan angka + daftar + tautan aksi. */
export type DetailSpec = {
  title: string; sub?: string; color?: string; icon?: any
  stats?: { l: string; v: string; c?: string }[]
  note?: string
  table?: { head: string[]; rows: (string | number)[][]; align?: ('l' | 'r')[] }
  actions?: ({ label: string; to: string } | { label: string; onClick: () => void })[]
  body?: ReactNode
}
const Ctx = createContext<{ open: (s: DetailSpec) => void; close: () => void }>({ open: () => {}, close: () => {} })
export const useDetail = () => useContext(Ctx)

export function DetailProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<DetailSpec | null>(null); const box = useRef<HTMLDivElement>(null); const prev = useRef<HTMLElement | null>(null)
  const open = useCallback((x: DetailSpec) => { prev.current = document.activeElement as HTMLElement; setS(x) }, [])
  const close = useCallback(() => { setS(null); prev.current?.focus?.() }, [])
  useEffect(() => {
    if (!s) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden'; box.current?.focus()
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [s, close])
  const I = s?.icon
  return <Ctx.Provider value={{ open, close }}>{children}
    {s && createPortal(<div className="dlg-back" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label={s.title} tabIndex={-1} ref={box} style={{ ['--c' as any]: s.color ?? '#e6b457' }}>
        <div className="dlg-h">{I && <span className="dlg-ic"><I size={18} /></span>}<div className="min-w-0 flex-1"><h3>{s.title}</h3>{s.sub && <p>{s.sub}</p>}</div><button className="dlg-x" aria-label="Tutup" onClick={close}><X size={18} /></button></div>
        <div className="dlg-b">
          {s.stats && <div className="dlg-stats">{s.stats.map(x => <div key={x.l} className="dlg-stat"><span>{x.l}</span><b style={x.c ? { color: x.c } : undefined}>{x.v}</b></div>)}</div>}
          {s.note && <p className="dlg-note">{s.note}</p>}
          {s.body}
          {s.table && <div className="dlg-tw"><table className="dt"><thead><tr>{s.table.head.map((h, i) => <th key={i} className={s.table!.align?.[i] === 'r' ? 'r' : ''}>{h}</th>)}</tr></thead>
            <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={s.table!.align?.[j] === 'r' ? 'r num' : ''}>{c}</td>)}</tr>)}</tbody></table></div>}
        </div>
        {s.actions && s.actions.length > 0 && <div className="dlg-f">{s.actions.map(a => 'to' in a
          ? <Link key={a.label} to={a.to} onClick={close} className="dlg-a">{a.label}<ArrowRight size={14} /></Link>
          : <button key={a.label} className="dlg-a" onClick={() => { a.onClick(); close() }}>{a.label}<ArrowRight size={14} /></button>)}</div>}
      </div></div>, document.body)}
  </Ctx.Provider>
}
