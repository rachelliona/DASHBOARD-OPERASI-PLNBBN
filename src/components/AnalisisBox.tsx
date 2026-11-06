import { AlertTriangle, Lightbulb, Sparkles } from 'lucide-react'
import type { Analisis } from '../domain/sebab'
/** Kotak sorotan: MASALAH (merah) dan SOLUSI (hijau), plus kalimat AI bila ada. Ini dugaan dari data sheet, bukan penyebab terkonfirmasi. */
export default function AnalisisBox({ a, ai, aiK, compact }: { a: Analisis; ai?: string | null; aiK?: string | null; compact?: boolean }) {
  return <div className={'grid gap-2 ' + (compact ? '' : 'md:grid-cols-2')}>
    <div className="hl hl-masalah"><div className="hl-t"><AlertTriangle size={13} />Masalah (dugaan)</div><p>{a.masalah}</p></div>
    <div className="hl hl-solusi"><div className="hl-t"><Lightbulb size={13} />Solusi / tindak lanjut</div><ul>{a.solusi.map(x => <li key={x}>{x}</li>)}</ul></div>
    {ai && <div className="hl hl-ai md:col-span-2"><div className="hl-t"><Sparkles size={13} />Analisis AI{aiK ? ` · keyakinan ${aiK}` : ''}</div><p>{ai}</p></div>}
  </div>
}
