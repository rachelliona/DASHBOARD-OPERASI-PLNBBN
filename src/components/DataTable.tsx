import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table'
import { Btn } from './ui'
import { downloadCsv } from '../domain/csv'
export type Col = { key: string; label: string; fmt?: (v: any, r: any) => string }
export function DataTable({ rows, cols, name, onRow }: { rows: any[]; cols: Col[]; name: string; onRow?: (r: any) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]); const [q, setQ] = useState('')
  const columns = useMemo<ColumnDef<any>[]>(() => cols.map(c => ({ id: c.key, accessorFn: (r: any) => r[c.key], header: c.label, cell: i => c.fmt ? c.fmt(i.getValue(), i.row.original) : String(i.getValue() ?? '—') })), [cols])
  const t = useReactTable({ data: rows, columns, state: { sorting, globalFilter: q }, onSortingChange: setSorting, onGlobalFilterChange: setQ,
    globalFilterFn: (row, _id, v) => cols.some(c => String(row.original[c.key] ?? '').toLowerCase().includes(String(v).toLowerCase())),
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 25 } } })
  const exportRows = () => downloadCsv(name, t.getFilteredRowModel().rows.map(r => Object.fromEntries(cols.map(c => [c.label, r.original[c.key] ?? '']))))
  return <div>
    <div className="flex gap-2 mb-2 no-print"><input aria-label="Cari" placeholder="Cari…" value={q} onChange={e => setQ(e.target.value)} /><Btn onClick={exportRows}>Ekspor CSV</Btn>
      <span className="text-xs text-slate-400 self-center">{t.getFilteredRowModel().rows.length} dari {rows.length} baris</span></div>
    <div className="overflow-auto max-h-[60vh]"><table className="w-full text-xs"><thead className="sticky top-0 bg-[#0b1f44]">{t.getHeaderGroups().map(g => <tr key={g.id}>{g.headers.map(h => <th key={h.id} className="p-1 cursor-pointer whitespace-nowrap" onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header, h.getContext())}{{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}</th>)}</tr>)}</thead>
      <tbody>{t.getRowModel().rows.map(r => <tr key={r.id} className={'border-t border-sky-900/40 ' + (onRow ? 'cursor-pointer hover:bg-sky-900/30' : '')} onClick={() => onRow?.(r.original)}>{r.getVisibleCells().map(c => <td key={c.id} className="p-1">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody></table></div>
    <div className="flex gap-2 mt-2 items-center no-print"><Btn disabled={!t.getCanPreviousPage()} onClick={() => t.previousPage()}>Sebelumnya</Btn><span className="text-xs">Halaman {t.getState().pagination.pageIndex + 1} / {Math.max(1, t.getPageCount())}</span><Btn disabled={!t.getCanNextPage()} onClick={() => t.nextPage()}>Berikutnya</Btn></div>
  </div>
}
