import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table'
import { Btn } from './ui'
import { downloadCsv } from '../domain/csv'
import { useSearchParams } from 'react-router-dom'
import { useDetail } from './Detail'
export type Col = { key: string; label: string; fmt?: (v: any, r: any) => ReactNode; tip?: string; sticky?: boolean }
const STK = { position: 'sticky', right: 0, background: 'var(--s1)', zIndex: 2, boxShadow: '-10px 0 14px -10px rgba(0,0,0,.8)' } as const
const plain = (v: any) => v == null || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('id-ID') : String(v)
export function DataTable({ rows, cols, name, onRow }: { rows: any[]; cols: Col[]; name: string; onRow?: (r: any) => void }) {
  const dt = useDetail(); const [sorting, setSorting] = useState<SortingState>([]); const [sp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') ?? '')
  useEffect(() => { const v = sp.get('q'); if (v != null) setQ(v) }, [sp])
  const columns = useMemo<ColumnDef<any>[]>(() => cols.map(c => ({ id: c.key, accessorFn: (r: any) => r[c.key], header: c.label, cell: i => c.fmt ? c.fmt(i.getValue(), i.row.original) : String(i.getValue() ?? '—') })), [cols])
  const t = useReactTable({ data: rows, columns, state: { sorting, globalFilter: q }, onSortingChange: setSorting, onGlobalFilterChange: setQ,
    globalFilterFn: (row, _id, v) => cols.some(c => String(row.original[c.key] ?? '').toLowerCase().includes(String(v).toLowerCase())),
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 25 } } })
  const open = (r: any) => { if (onRow) return onRow(r); const title = plain(r.pltu ?? r.id ?? r.nama ?? r[cols[0].key]); const acts: any[] = []
    if (r.pltu) acts.push({ label: 'Buka halaman PLTU', to: '/pltu/' + encodeURIComponent(r.pltu) })
    dt.open({ title, sub: name.replace(/-/g, ' '), table: { head: ['Kolom', 'Nilai'], rows: cols.map(c => [c.label, plain(r[c.key])]) }, actions: acts }) }
  const exportRows = () => downloadCsv(name, t.getFilteredRowModel().rows.map(r => Object.fromEntries(cols.map(c => [c.label, r.original[c.key] ?? '']))))
  return <div>
    <div className="flex flex-wrap gap-2 mb-2 no-print"><input aria-label="Cari" placeholder="Cari…" value={q} onChange={e => setQ(e.target.value)} className="flex-1 min-w-[8rem] sm:flex-none" /><select aria-label="Urutkan" className="sm:hidden" value={sorting[0]?.id ?? ''} onChange={e => setSorting(e.target.value ? [{ id: e.target.value, desc: sorting[0]?.desc ?? false }] : [])}><option value="">Urutkan…</option>{cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>{sorting[0] && <Btn className="sm:hidden" onClick={() => setSorting([{ id: sorting[0].id, desc: !sorting[0].desc }])}>{sorting[0].desc ? '▼' : '▲'}</Btn>}<Btn onClick={exportRows}>Ekspor CSV</Btn>
      <span className="text-xs text-slate-400 self-center">{t.getFilteredRowModel().rows.length} dari {rows.length} baris</span></div>
    <div className="tbw overflow-auto max-h-[60vh] sm:max-h-[60vh] max-sm:max-h-none"><table className="rt w-full text-xs"><thead className="sticky top-0 thd">{t.getHeaderGroups().map(g => <tr key={g.id}>{g.headers.map(h => { const c = cols.find(x => x.key === h.column.id); return <th key={h.id} title={c?.tip} style={c?.sticky ? { ...STK, background: 'var(--s1)' } : undefined} className="p-2 cursor-pointer whitespace-nowrap select-none" onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header, h.getContext())}{{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}</th> })}</tr>)}</thead>
      <tbody>{t.getRowModel().rows.map(r => <tr key={r.id} className="trow cursor-pointer" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(r.original) }} onClick={() => open(r.original)}>{r.getVisibleCells().map(c => <td key={c.id} className="p-2" style={cols.find(x => x.key === c.column.id)?.sticky ? STK : undefined} data-label={String(c.column.columnDef.header)}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody></table></div>
    <div className="flex gap-2 mt-2 items-center no-print"><Btn disabled={!t.getCanPreviousPage()} onClick={() => t.previousPage()}>Sebelumnya</Btn><span className="text-xs">Halaman {t.getState().pagination.pageIndex + 1} / {Math.max(1, t.getPageCount())}</span><Btn disabled={!t.getCanNextPage()} onClick={() => t.nextPage()}>Berikutnya</Btn></div>
  </div>
}
