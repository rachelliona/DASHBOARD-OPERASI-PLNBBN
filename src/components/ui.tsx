import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
export const Card = ({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="rounded-lg border border-sky-900/60 bg-[#0b1f44] p-3 mb-3">{(title || right) && <div className="flex justify-between items-center mb-3"><h2 className="font-semibold">{title}</h2>{right}</div>}{children}</section>)
export const Empty = ({ text = 'Data Belum Tersedia', hint }: { text?: string; hint?: string }) => (
  <Card><div className="text-center py-10"><p className="text-lg font-semibold text-amber-300">{text}</p><p className="text-xs text-slate-400 mt-1">{hint ?? 'Impor CSV atau hubungkan sumber di halaman'} <Link className="text-sky-400 underline" to="/sumber-data">Sumber Data dan Kualitas Data</Link>.</p></div></Card>)
export const Kpi = ({ label, value, unit, note, tip }: { label: string; value: string; unit?: string; note?: string; tip?: string }) => (
  <div title={tip} className="rounded-lg border border-sky-900/60 bg-[#0b1f44] p-3"><div className="text-xs text-slate-400">{label}</div><div className="text-xl font-bold num">{value} <span className="text-xs font-normal">{unit}</span></div>{note && <div className="text-xs text-amber-300">{note}</div>}</div>)
export const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={'rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-40 px-3 py-1.5 text-xs ' + (p.className ?? '')} />
