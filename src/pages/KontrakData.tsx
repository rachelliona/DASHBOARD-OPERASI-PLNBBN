import { useMemo, useRef, useState } from 'react'
import { Database } from 'lucide-react'
import { Card, PageHead } from '../components/ui'
import { KTabs } from '../components/kontrakViz'
import { CLUSTERS, Cluster, clusterOf, Kontrak, newId, parsePaste, STATUS_LABEL, toCsvRows } from '../domain/kontrak'
import { downloadCsv, parseCsv } from '../domain/csv'
import { fmtNum } from '../domain/format'
import { kontrakActions, useKontrak } from '../kontrakStore'
import KontrakSumber from '../components/KontrakSumber'
type Tab = 'form' | 'editor' | 'master'
const uniq = (rs: Kontrak[], f: 'pelanggan' | 'tambang') => [...new Set(rs.map(r => r[f]).filter(Boolean))].sort()
export default function KontrakData() {
  const k = useKontrak(); const [tab, setTab] = useState<Tab>('form'); const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const say = (t: string, ok = true) => setMsg({ t, ok })
  return <>
    <PageHead icon={Database} color="#e6b457" title="Data kontrak" month={false} sub="Tambah, ubah, dan impor kontrak. Seluruh halaman Kontrak ikut berubah langsung." /><KontrakSumber edit />
    <KTabs />
    <div className="text-[11.5px] rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 mb-3 text-slate-300">Perubahan disimpan <b>di browser ini saja</b> ({k.custom ? 'sudah berbeda dari data awal' : 'masih data awal'}). Untuk membagikan ke rekan, unduh CSV lalu impor di browser mereka. {msg && <span className="ml-2 font-semibold" style={{ color: msg.ok ? '#34d399' : '#fbbf24' }} aria-live="polite">{msg.t}</span>}</div>
    <div className="vsw mb-3" role="tablist" aria-label="Modul data">{([['form', 'Tambah kontrak'], ['editor', 'Editor tabel & impor'], ['master', 'Master PLTU & pemasok']] as [Tab, string][]).map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={'vsw-b' + (tab === v ? ' on' : '')}><span>{l}</span></button>)}</div>
    {tab === 'form' && <Form say={say} />}{tab === 'editor' && <Editor say={say} />}{tab === 'master' && <Master say={say} />}
  </>
}
function Form({ say }: { say: (t: string, ok?: boolean) => void }) {
  const { rows } = useKontrak(); const [f, setF] = useState({ pelanggan: '', tambang: '', gar: '', vol: '', cluster: '' as '' | Cluster, status: '0' }); const g = +f.gar
  const submit = () => {
    const err = !f.pelanggan.trim() ? 'PLTU / pelanggan wajib diisi.' : !f.tambang.trim() ? 'Sumber tambang wajib diisi.' : !(g >= 2500 && g <= 7000) ? 'GAR harus antara 2.500 dan 7.000.' : !(+f.vol > 0) ? 'Volume harus lebih dari 0.' : ''
    if (err) return say(err, false)
    const np = !uniq(rows, 'pelanggan').includes(f.pelanggan.trim()), nt = !uniq(rows, 'tambang').includes(f.tambang.trim()), dup = rows.some(r => r.pelanggan === f.pelanggan.trim() && r.tambang === f.tambang.trim() && r.gar === g && r.vol === +f.vol)
    kontrakActions.add({ no: String(Math.max(0, ...rows.map(r => +r.no || 0)) + 1), pelanggan: f.pelanggan.trim(), tambang: f.tambang.trim(), gar: g, cluster: f.cluster || clusterOf(g), vol: +f.vol, status: +f.status ? 1 : 0 })
    say('Kontrak tersimpan' + (np ? '. PLTU baru masuk master' : '') + (nt ? '. Pemasok baru masuk master' : '') + (dup ? '. Perhatian: ada kontrak identik, periksa duplikat' : '') + '.', !dup); setF({ ...f, pelanggan: '', tambang: '', gar: '', vol: '' })
  }
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="flex flex-col gap-1 text-xs text-slate-400">{t}{children}</label>
  return <Card title="Input kontrak baru"><div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))] [&_input]:!py-2 [&_select]:!py-2">
    <L t="PLTU / pelanggan"><input list="kp" value={f.pelanggan} onChange={e => setF({ ...f, pelanggan: e.target.value })} placeholder="Pilih atau ketik PLTU baru" /></L>
    <L t="Sumber tambang (pemasok)"><input list="kt" value={f.tambang} onChange={e => setF({ ...f, tambang: e.target.value })} placeholder="Pilih atau ketik pemasok baru" /></L>
    <L t="GAR (kcal/kg)"><input type="number" min={2500} max={7000} value={f.gar} onChange={e => setF({ ...f, gar: e.target.value })} placeholder="mis. 4200" /></L>
    <L t="Volume (MT)"><input type="number" min={1} value={f.vol} onChange={e => setF({ ...f, vol: e.target.value })} placeholder="mis. 250000" /></L>
    <L t="Cluster"><select value={f.cluster} onChange={e => setF({ ...f, cluster: e.target.value as any })}><option value="">Otomatis dari GAR{g ? ` (${clusterOf(g)})` : ''}</option>{CLUSTERS.map(c => <option key={c}>{c}</option>)}</select></L>
    <L t="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="0">Terkontrak</option><option value="1">On Progress Kontrak Baru</option></select></L>
  </div><datalist id="kp">{uniq(rows, 'pelanggan').map(v => <option key={v} value={v} />)}</datalist><datalist id="kt">{uniq(rows, 'tambang').map(v => <option key={v} value={v} />)}</datalist>
    <button className="btn rounded-lg font-semibold px-4 py-2 text-xs mt-4" onClick={submit}>Simpan kontrak</button></Card>
}
function Editor({ say }: { say: (t: string, ok?: boolean) => void }) {
  const { rows } = useKontrak(); const [paste, setPaste] = useState(''); const [sure, setSure] = useState(false); const file = useRef<HTMLInputElement>(null)
  const imp = (replace: boolean) => { const r = parsePaste(paste); if (!r.length) return say('Format tidak terbaca. Pastikan ada 7 kolom yang dipisah tab, seperti hasil salin dari Excel.', false); kontrakActions.set(replace ? r : [...rows, ...r]); setPaste(''); say(`${r.length} baris ${replace ? 'menggantikan data lama' : 'ditambahkan'}.`) }
  const onFile = async (f?: File) => { if (!f) return; const p = parseCsv(await f.text()); const g = (r: Record<string, string>, ...ks: string[]) => { for (const x of ks) if (r[x] != null) return r[x]; return '' }
    const out: Kontrak[] = p.rows.map(r => { const gar = parseInt(g(r, 'GAR').replace(/\D/g, ''), 10) || 0, c = g(r, 'Cluster').toUpperCase(); return { id: newId(), no: g(r, 'No') || '-', pelanggan: g(r, 'PLTU / Pelanggan', 'PLTU Pelanggan').trim(), tambang: g(r, 'Sumber tambang (pemasok)', 'Sumber tambang', 'Sumber Tambang').trim(), gar, cluster: (CLUSTERS as string[]).includes(c) ? c as Cluster : clusterOf(gar), vol: parseInt(g(r, 'Volume (MT)').replace(/\D/g, ''), 10) || 0, status: (/progress/i.test(g(r, 'Status')) ? 1 : 0) as 0 | 1 } }).filter(r => r.pelanggan && r.gar > 0 && r.vol > 0)
    if (!out.length) return say('CSV tidak terbaca. Pakai file hasil Unduh CSV dari halaman ini.', false); kontrakActions.set(out); say(`${out.length} kontrak diimpor dari ${f.name}.`) }
  const num = 'w-[110px]'
  return <div className="space-y-3">
    <Card title="Editor tabel (klik sel untuk mengubah)" right={<div className="flex flex-wrap gap-2 text-xs no-print">
      <button className="fchip" onClick={() => kontrakActions.add({ no: String(Math.max(0, ...rows.map(r => +r.no || 0)) + 1), pelanggan: '', tambang: '', gar: 4000, cluster: 'LRC', vol: 0, status: 0 })}>+ Tambah baris</button>
      <button className="fchip" onClick={() => downloadCsv('kontrak', toCsvRows(rows))}>Unduh CSV</button>
      <button className="fchip" onClick={() => file.current?.click()}>Impor CSV</button><input ref={file} type="file" accept=".csv,text/csv" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      <button className={'fchip' + (sure ? ' on' : '')} onClick={() => { if (!sure) { setSure(true); setTimeout(() => setSure(false), 3500); return } kontrakActions.reset(); setSure(false); say('Data dikembalikan ke 50 kontrak awal.') }}>{sure ? 'Yakin? Klik lagi' : 'Kembalikan data awal'}</button></div>}>
      <p className="text-[11px] text-slate-400 mb-2">{rows.length} baris. Mengubah GAR otomatis menyarankan cluster (di bawah 4.400 LRC, di bawah 5.000 MRC, selebihnya HRC) dan tetap bisa diubah.</p>
      <div className="overflow-auto max-h-[520px] rounded-xl border border-white/10"><table className="w-full text-xs min-w-[980px] kedit"><thead className="sticky top-0 bg-[var(--s1)] z-10"><tr>{['No', 'PLTU / Pelanggan', 'Sumber tambang', 'GAR', 'Cluster', 'Volume (MT)', 'Status', ''].map(h => <th key={h} className="text-left px-2 py-2 text-slate-400 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t border-white/5">
        <td className="px-1"><input aria-label="No" className="w-[54px]" value={r.no} onChange={e => kontrakActions.patch(r.id, { no: e.target.value })} /></td>
        <td className="px-1"><input aria-label="PLTU" className="w-full" value={r.pelanggan} onChange={e => kontrakActions.patch(r.id, { pelanggan: e.target.value })} /></td>
        <td className="px-1"><input aria-label="Sumber tambang" className="w-full" value={r.tambang} onChange={e => kontrakActions.patch(r.id, { tambang: e.target.value })} /></td>
        <td className="px-1"><input aria-label="GAR" type="number" className="w-[84px]" value={r.gar} onChange={e => kontrakActions.patch(r.id, { gar: +e.target.value })} /></td>
        <td className="px-1"><select aria-label="Cluster" value={r.cluster} onChange={e => kontrakActions.patch(r.id, { cluster: e.target.value as Cluster })}>{CLUSTERS.map(c => <option key={c}>{c}</option>)}</select></td>
        <td className="px-1"><input aria-label="Volume" type="number" className={num} value={r.vol} onChange={e => kontrakActions.patch(r.id, { vol: +e.target.value })} /></td>
        <td className="px-1"><select aria-label="Status" value={r.status} onChange={e => kontrakActions.patch(r.id, { status: +e.target.value as 0 | 1 })}><option value={0}>{STATUS_LABEL[0]}</option><option value={1}>{STATUS_LABEL[1]}</option></select></td>
        <td className="px-1"><button className="fchip" aria-label={`Hapus kontrak ${r.pelanggan}`} onClick={() => kontrakActions.remove(r.id)}>Hapus</button></td></tr>)}</tbody></table></div></Card>
    <Card title="Tempel dari Excel"><p className="text-[11.5px] text-slate-400 mb-2">Salin sel dari Excel atau Google Sheets dengan urutan kolom: No, PLTU, Sumber Tambang, GAR, Cluster, Volume, Status. Lalu tempel di sini.</p>
      <textarea aria-label="Tempel data dari Excel" value={paste} onChange={e => setPaste(e.target.value)} placeholder={'4\tPLN/PNP\tPT Artha Tunggal Mandiri\t3700\tLRC\t687,000\tTerkontrak'} className="w-full min-h-[90px] font-mono !text-[12px] !p-2.5" />
      <div className="flex gap-2 mt-2 text-xs"><button className="fchip" onClick={() => imp(true)}>Ganti semua data</button><button className="fchip" onClick={() => imp(false)}>Tambahkan ke data</button></div></Card></div>
}
function Master({ say }: { say: (t: string, ok?: boolean) => void }) {
  const { rows } = useKontrak(); const [kind, setKind] = useState<'pelanggan' | 'tambang'>('pelanggan'); const [armed, setArmed] = useState('')
  const list = useMemo(() => { const m = new Map<string, { n: number; v: number; g: number }>(); rows.forEach(r => { const a = m.get(r[kind]) ?? { n: 0, v: 0, g: 0 }; a.n++; a.v += r.vol; a.g += r.gar * r.vol; m.set(r[kind], a) }); return [...m].sort((a, b) => b[1].v - a[1].v) }, [rows, kind])
  return <Card title="Master PLTU / pelanggan dan pemasok"><div className="vsw mb-3" role="tablist">{([['pelanggan', 'PLTU / pelanggan'], ['tambang', 'Pemasok']] as const).map(([v, l]) => <button key={v} role="tab" aria-selected={kind === v} onClick={() => setKind(v)} className={'vsw-b' + (kind === v ? ' on' : '')}><span>{l}</span></button>)}</div>
    <p className="text-[11.5px] text-slate-400 mb-2">{list.length} data master. Ubah nama lalu tekan Enter atau pindah sel untuk memperbarui semua kontrak terkait. Nama pelanggan yang dikenali dashboard (mis. “PLTU Cilacap”) dipakai untuk mencocokkan realisasi per PLTU, jadi ubah dengan hati-hati.</p>
    <div className="overflow-auto max-h-[480px] rounded-xl border border-white/10"><table className="w-full text-xs min-w-[620px]"><thead className="sticky top-0 bg-[var(--s1)]"><tr>{['Nama', 'Kontrak', 'Volume (MT)', 'GAR rata-rata', ''].map(h => <th key={h} className="text-left px-2 py-2 text-slate-400 font-medium">{h}</th>)}</tr></thead><tbody>{list.map(([n, s]) => <tr key={n} className="border-t border-white/5">
      <td className="px-1"><input aria-label="Nama master" className="w-full" defaultValue={n} onBlur={e => { const v = e.target.value.trim(); if (!v || v === n) { e.target.value = n; return } kontrakActions.rename(kind, n, v); say(`“${n}” diganti menjadi “${v}” pada ${s.n} kontrak.`) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} /></td>
      <td className="px-2 tabular-nums">{s.n}</td><td className="px-2 tabular-nums">{fmtNum(s.v)}</td><td className="px-2 tabular-nums">{s.v ? fmtNum(s.g / s.v) : 0}</td>
      <td className="px-1"><button className={'fchip' + (armed === n ? ' on' : '')} onClick={() => { if (armed !== n) { setArmed(n); setTimeout(() => setArmed(''), 3500); return } kontrakActions.removeBy(kind, n); setArmed(''); say(`${s.n} kontrak “${n}” dihapus.`) }}>{armed === n ? `Hapus ${s.n} kontrak? Klik lagi` : 'Hapus'}</button></td></tr>)}</tbody></table></div></Card>
}
