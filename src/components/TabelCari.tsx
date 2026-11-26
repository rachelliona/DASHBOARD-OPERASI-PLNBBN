import { ReactNode, isValidElement, useMemo, useState } from 'react'

/** Ambil teks polos dari sel tabel (string, angka, atau elemen React). */
export function teksSel(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(teksSel).join(' ')
  if (isValidElement(n)) return teksSel((n.props as { children?: ReactNode }).children)
  return ''
}
/** Kunci urut: angka (Rp 1.234,5 · 12 hari · -3), tanggal (Saturday, November 28, 2026 / 28 Nov 2026), atau teks. */
export function kunciUrut(t: string): number | string {
  const s = t.trim(); if (!s || s === '—' || s === '-') return Number.NEGATIVE_INFINITY
  const a = s.replace(/^rp\s*/i, '').replace(/\s*(hari|m|mt|dok|%|ton)$/i, '')
  if (/^-?[\d.]+(,\d+)?$/.test(a)) return parseFloat(a.replace(/\./g, '').replace(',', '.'))
  if (/\b(19|20)\d{2}\b/.test(s) && /[a-z]/i.test(s)) { const d = Date.parse(s.replace(/^[A-Za-z]+,\s*/, '')); if (!isNaN(d)) return d }
  return s.toLowerCase()
}
const banding = (x: number | string, y: number | string) => typeof x === 'number' && typeof y === 'number' ? x - y : typeof x === 'number' ? -1 : typeof y === 'number' ? 1 : x.localeCompare(y, 'id')

export type Urut = { k: number; arah: 1 | -1 } | null
/** Hook cari + urut untuk data apa pun. kolom: label + fungsi teks per baris. */
export function useCariUrut<T>(data: T[], kolom: { l: string; t: (x: T) => string }[]) {
  const [q, setQ] = useState(''); const [f, setF] = useState(-1); const [u, setU] = useState<Urut>(null)
  const hasil = useMemo(() => {
    const qq = q.trim().toLowerCase(); let r = data
    if (qq) r = r.filter(x => (f < 0 ? kolom : [kolom[f]]).some(k => k.t(x).toLowerCase().includes(qq)))
    if (u) { const k = kolom[u.k]; r = [...r].sort((a, b) => banding(kunciUrut(k.t(a)), kunciUrut(k.t(b))) * u.arah) }
    return r
  }, [data, q, f, u, kolom])
  const klik = (k: number) => setU(o => !o || o.k !== k ? { k, arah: 1 } : o.arah === 1 ? { k, arah: -1 } : null)
  const panah = (k: number) => u?.k === k ? (u.arah === 1 ? ' ▲' : ' ▼') : ''
  return { q, setQ, f, setF, u, klik, panah, hasil }
}
/** Bilah cari: kotak teks + pilihan "cari berdasarkan". */
export function BilahCari({ q, setQ, f, setF, opsi, jumlah, total, ph }: { q: string; setQ: (s: string) => void; f: number; setF: (n: number) => void; opsi: string[]; jumlah: number; total: number; ph?: string }) {
  return <div className="tcari"><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={ph ?? 'Cari…'} aria-label="Cari" />
    <select value={f} onChange={e => setF(+e.target.value)} aria-label="Cari berdasarkan"><option value={-1}>Semua kolom</option>{opsi.map((o, i) => <option key={i} value={i}>{o}</option>)}</select>
    <span className="tcari-n">{jumlah === total ? `${total} baris` : `${jumlah} dari ${total}`}</span></div>
}
/** Tabel siap pakai dengan cari + urut (klik judul kolom). */
export function TabelCari({ head, rows, align, className = 'dt', cari = true, onRow }: { head: string[]; rows: ReactNode[][]; align?: ('l' | 'r')[]; className?: string; cari?: boolean; onRow?: (i: number) => void }) {
  const idx = useMemo(() => rows.map((_, i) => i), [rows]); const teks = useMemo(() => rows.map(r => r.map(teksSel)), [rows])
  const kolom = useMemo(() => head.map((l, j) => ({ l, t: (i: number) => teks[i][j] ?? '' })), [head, teks])
  const s = useCariUrut(idx, kolom)
  return <>{cari && <BilahCari {...s} opsi={head} jumlah={s.hasil.length} total={rows.length} />}
    <table className={className}><thead><tr>{head.map((h, i) => <th key={i} className={'th-sort ' + (align?.[i] === 'r' ? 'r' : '')} onClick={() => s.klik(i)} title="Klik untuk urutkan">{h}{s.panah(i)}</th>)}</tr></thead>
      <tbody>{s.hasil.map(i => <tr key={i} onClick={onRow ? () => onRow(i) : undefined} className={onRow ? 'cursor-pointer' : ''}>{rows[i].map((c, j) => <td key={j} className={align?.[j] === 'r' ? 'r num' : ''}>{c}</td>)}</tr>)}
        {!s.hasil.length && <tr><td colSpan={head.length} className="text-center text-slate-400 py-3">Tidak ada yang cocok.</td></tr>}</tbody></table></>
}
