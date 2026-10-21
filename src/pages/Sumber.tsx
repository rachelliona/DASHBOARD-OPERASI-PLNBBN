import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Btn, Card } from '../components/ui'
import { SOURCES } from '../config/sources'
import { parseCsv, Parsed } from '../domain/csv'
import { KINDS, applyMapping } from '../domain/schema'
import { norm } from '../domain/status'
import { distinctShipments, duplicateIds } from '../domain/kpi'
import { nowWib } from '../domain/format'
export default function Sumber() {
  const { kinds, raw, status, setKind, setRaw, setStatus } = useStore()
  const [file, setFile] = useState<{ name: string; p: Parsed } | null>(null); const [target, setTarget] = useState('plant'); const [map, setMap] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('')
  const fields = KINDS[target]?.fields
  useEffect(() => { if (!file || !fields) return
    const saved = JSON.parse(localStorage.getItem('map:' + target) ?? '{}'); const m: Record<string, string> = {}
    fields.forEach(f => { const h = file.p.headers.find(x => x === saved[f.key]) ?? file.p.headers.find(x => norm(x) === norm(f.key) || norm(x) === norm(f.label)); if (h) m[f.key] = h }); setMap(m) }, [file, target])
  const onFile = async (f?: File) => { if (!f) return; setMsg(''); setFile({ name: f.name, p: parseCsv(await f.text()) }) }
  const apply = () => { if (!file) return; const at = nowWib()
    if (!fields) { setRaw(target.slice(4), { rows: file.p.rows, rejected: [], source: `Impor lokal: ${file.name}`, at, headers: file.p.headers }); setMsg(`${file.p.rows.length} baris dimuat sebagai data mentah.`); return }
    const { ok, rejected } = applyMapping(file.p.rows, map, fields); localStorage.setItem('map:' + target, JSON.stringify(map))
    setKind(target, { rows: ok, rejected, source: `Impor lokal: ${file.name}`, at }); setMsg(`${ok.length} baris berhasil dibaca, ${rejected.length} baris ditolak, ${file.p.errors.length} kesalahan parsing.`) }
  const missing = fields?.filter(f => f.required && !map[f.key]).map(f => f.label) ?? []
  const fetchSrc = async (s: typeof SOURCES[0]) => { setStatus(s.name, { state: 'Mengambil…' }); const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000)
    try { const r = await fetch(s.url, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); const p = parseCsv(await r.text()); if (!p.headers.length) throw new Error('Header tidak ditemukan'); const at = nowWib()
      setRaw(s.name, { rows: p.rows, rejected: [], source: 'URL CSV', at, headers: p.headers }); setStatus(s.name, { state: 'Terhubung (belum dipetakan)', at })
    } catch (e: any) { setStatus(s.name, { state: 'Gagal Diakses', msg: (e.name === 'AbortError' ? 'Waktu habis (15 dtk)' : e.message) + ' — kemungkinan diblokir CORS/jaringan' }) } finally { clearTimeout(t) } }
  const sh = kinds.shipment?.rows ?? []; const unmappedStatus = sh.filter(r => r.statusRaw && !r.status).length
  return <>
    <Card title="Impor CSV Lokal">
      <div className="flex flex-wrap gap-2 items-center mb-2"><input type="file" accept=".csv,text/csv" aria-label="Pilih file CSV" onChange={e => onFile(e.target.files?.[0])} />
        <select aria-label="Tujuan impor" value={target} onChange={e => setTarget(e.target.value)}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}{SOURCES.map(s => <option key={s.name} value={'raw:' + s.name}>Data mentah — {s.name}</option>)}</select></div>
      {file && <><p className="text-sm">{file.name}: {file.p.rows.length} baris, {file.p.headers.length} kolom, {file.p.errors.length} kesalahan parsing.</p>{file.p.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-amber-300">{e}</p>)}
        {fields && <div className="grid md:grid-cols-2 gap-2 my-3">{fields.map(f => <label key={f.key} className="text-sm">{f.label}{f.required && ' *'}: <select value={map[f.key] ?? ''} onChange={e => setMap({ ...map, [f.key]: e.target.value })}><option value="">— tidak dipetakan —</option>{file.p.headers.map(h => <option key={h}>{h}</option>)}</select></label>)}</div>}
        <div className="overflow-auto max-h-40 text-xs mb-2"><table><thead><tr>{file.p.headers.map(h => <th key={h} className="pr-3">{h}</th>)}</tr></thead><tbody>{file.p.rows.slice(0, 5).map((r, i) => <tr key={i}>{file.p.headers.map(h => <td key={h} className="pr-3">{r[h]}</td>)}</tr>)}</tbody></table></div>
        {missing.length > 0 && <p className="text-xs text-amber-300">Pemetaan belum lengkap, kolom wajib: {missing.join(', ')}</p>}
        <Btn disabled={missing.length > 0} onClick={apply}>Terapkan Impor</Btn> <span className="text-sm">{msg}</span></>}
    </Card>
    <Card title="Kualitas Data (dataset terimpor)">{Object.keys(kinds).length === 0 ? <p className="text-sm">Data Belum Tersedia.</p> : <ul className="text-sm list-disc pl-5">
      {Object.entries(kinds).map(([k, d]) => <li key={k}>{KINDS[k].label}: {d.rows.length} baris diterima, {d.rejected.length} ditolak{d.rejected.slice(0, 3).map(r => <div key={r.row} className="text-xs text-amber-300">Baris {r.row}: {r.reason}</div>)}</li>)}
      {kinds.shipment && <li>Shipment: {distinctShipments(sh)} ID unik dari {sh.length} baris; {duplicateIds(sh)} ID terduplikasi; {unmappedStatus} baris dengan status yang belum dipetakan (tidak ditebak).</li>}
      {kinds.plant && <li>PLTU tanpa koordinat: {kinds.lokasi ? kinds.plant.rows.filter(p => !kinds.lokasi.rows.some(l => norm(l.nama) === norm(p.pltu))).length : 'master lokasi belum diimpor'}</li>}</ul>}</Card>
    <Card title="Registri 31 Sumber CSV" right={<Btn onClick={() => SOURCES.forEach(fetchSrc)}>Coba Ambil Semua</Btn>}>
      <p className="text-xs text-slate-400 mb-2">Status "Terhubung" hanya muncul setelah permintaan benar-benar berhasil. Endpoint ini publik (bukan rahasia); lihat README.</p>
      <div className="overflow-auto max-h-[50vh]"><table className="w-full text-sm"><thead><tr><th>Sheet</th><th>GID</th><th>Status</th><th>Pengambilan Terakhir</th><th>Baris</th><th>Pesan</th><th></th></tr></thead><tbody>{SOURCES.map(s => <tr key={s.name} className="border-t border-sky-900/40"><td>{s.name}</td><td>{s.gid}</td><td>{status[s.name]?.state ?? 'Belum Terhubung'}</td><td>{status[s.name]?.at ?? '—'}</td><td>{raw[s.name]?.rows.length ?? '—'}</td><td className="text-xs text-amber-300">{status[s.name]?.msg}</td><td><Btn onClick={() => fetchSrc(s)}>Ambil</Btn></td></tr>)}</tbody></table></div></Card></>
}
