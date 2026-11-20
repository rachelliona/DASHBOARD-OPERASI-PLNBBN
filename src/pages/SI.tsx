import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Card, Kpi, PageHead } from '../components/ui'
import { useAuth } from '../auth'
import { bisaBuatSI, isAdmin } from '../config/nav'
import { useSI, siActions } from '../si/store'
import { ALASAN, Alasan, SI, kosong } from '../si/types'
import { STATUS_LABEL, Status, bandingkan, cekKoreksi, fmtNomor, iso, nomorBerikut, periksa, rantai, rentangId, statusOf, supersededIds, tglId, FIELDS } from '../si/logic'
import { dariDatabas, dariSheet, gabung } from '../si/legacy'
import { unduhPdf } from '../si/pdf'
import { getParaf, setParaf, unduhDocx } from '../si/docx'
import { APPS_SCRIPT } from '../si/appsscript'
const B = import.meta.env.BASE_URL
type Ref = { pltu: string[][]; mitra: string[][]; transport: string[][]; jetty: string[][]; moda: string[] }
let refCache: Ref | null = null
const useRef_ = () => { const [r, setR] = useState<Ref | null>(refCache); useEffect(() => { if (!refCache) fetch(B + 'si/ref.json').then(x => x.json()).then(j => { refCache = j; setR(j) }).catch(() => { /* tanpa referensi */ }) }, []); return r }
const WARNA: Record<Status, string> = { pengajuan: '#8aa0b8', batal: '#6b7280', direvisi: '#a78bfa', lewat: '#f87171', arsip: '#64748b', segera: '#f59e0b', aktif: '#34d399', 'tanpa-laycan': '#94a3b8' }
const Chip = ({ s }: { s: Status }) => <span className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap" style={{ background: WARNA[s] + '26', color: WARNA[s], border: `1px solid ${WARNA[s]}66` }}>{STATUS_LABEL[s]}</span>
type Tab = 'monitor' | 'antrean' | 'nomor' | 'sinkron'
export default function SIPage() {
  const st = useSI(); const { user } = useAuth(); const admin = isAdmin(user); const bisa = bisaBuatSI(user) || admin; const [tab, setTab] = useState<Tab>('monitor'); const nav = useNavigate(); const [info, setInfo] = useState('')
  const today = iso(new Date()); const sup = useMemo(() => supersededIds(st.rows), [st.rows]); const cek = useMemo(() => periksa(st.rows, st.blok), [st.rows, st.blok])
  const tahunIni = new Date().getFullYear(); const thn = st.rows.filter(r => r.tahun === tahunIni && r.tahap !== 'pengajuan')
  const lewat = thn.filter(r => statusOf(r, today, sup) === 'lewat').length, rev = thn.filter(r => r.revisiKe > 0).length, revArmada = thn.filter(r => r.alasan === 'armada').length, antre = st.rows.filter(r => r.tahap === 'pengajuan').length
  return <>
    <PageHead icon={FileText} title="Shipping Instruction" month={false} sub="Penomoran SI otomatis tanpa dobel, monitoring laycan & revisi, dan cetak dokumen." right={bisa ? <button className="fchip on !text-[16px] !font-bold !px-6 !py-3 !rounded-2xl" onClick={() => nav('/si/baru')} aria-label="Buat SI baru">+ Buat SI</button> : undefined} />
    {info && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] mb-3 flex justify-between gap-2"><span>{info}</span><button onClick={() => setInfo('')} aria-label="Tutup">×</button></div>}
    {!st.rows.length && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] mb-3">Registri SI masih kosong. Buka tab <b>Sinkron &amp; impor</b> untuk memuat riwayat SI (Databas SI + sheet 2026) agar nomor berikutnya tepat.</div>}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
      <Kpi label={`SI terbit ${tahunIni}`} value={String(thn.length)} note={`nomor berikut ${nomorBerikut(st.rows, st.blok, tahunIni)}`} />
      <Kpi label="Lewat laycan" value={String(lewat)} accent="#f87171" note="≤30 hari, belum direvisi" />
      <Kpi label="Revisi" value={String(rev)} accent="#a78bfa" note={`${revArmada} karena armada diganti`} />
      <Kpi label="Nomor dobel" value={String(cek.dobel.size)} accent={cek.dobel.size ? '#f87171' : '#34d399'} note={cek.dobel.size ? 'perlu dibereskan' : 'aman'} />
      <Kpi label="Antrean pengajuan" value={String(antre)} accent="#8aa0b8" note="menunggu Racel" />
    </div>
    <div className="vsw mb-3" role="tablist" aria-label="Modul SI">{([['monitor', 'Monitoring SI'], ['antrean', 'Antrean pengajuan'], ['nomor', 'Nomor & celah'], ['sinkron', 'Sinkron & impor']] as [Tab, string][]).map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} className={'vsw-b' + (tab === v ? ' on' : '')} onClick={() => setTab(v)}>{l}{v === 'antrean' && antre ? ` (${antre})` : ''}</button>)}</div>
    <div className="flex items-center gap-2 mb-3 text-[12px]"><span className="text-slate-400">Dokumen hasil unduhan:</span><ParafPilih /></div>
    {tab === 'monitor' && <Monitor today={today} sup={sup} onAksi={(mode, si) => nav(`/si/${mode}/${si.id}`)} admin={admin} bisa={bisa} />}
    {tab === 'antrean' && <Antrean admin={bisa} onBuka={x => nav(`/si/edit/${x.id}`)} info={setInfo} />}
    {tab === 'nomor' && <Nomor admin={admin} />}
    {tab === 'sinkron' && <Sinkron admin={admin} />}
  </>
}
function ParafPilih() { const [p, setP] = useState(getParaf()); return <span className="inline-flex gap-1.5">{([['ada', 'Dengan paraf template'], ['kosong', 'Kosongan (tanpa paraf)']] as const).map(([v, l]) => <button key={v} className={'fchip' + (p === v ? ' on' : '')} onClick={() => { setParaf(v); setP(v) }}>{l}</button>)}</span> }
function Monitor({ today, sup, onAksi, admin, bisa }: { today: string; sup: Set<string>; onAksi: (m: 'revisi' | 'koreksi', s: SI) => void; admin: boolean; bisa: boolean }) {
  const { rows, blok } = useSI(); const cek = useMemo(() => periksa(rows, blok), [rows, blok]); const [q, setQ] = useState(''); const [th, setTh] = useState(String(new Date().getFullYear())); const [f, setF] = useState<string>('semua'); const [pm, setPm] = useState(''); const [buka, setBuka] = useState('')
  const masalah = useMemo(() => new Map(cek.masalah.map(m => [m.id, m])), [cek])
  const data = useMemo(() => rows.filter(r => r.tahap !== 'pengajuan').map(r => ({ r, s: statusOf(r, today, sup) })).filter(({ r, s }) => {
    if (th !== 'semua' && String(r.tahun) !== th) return false; if (pm && r.pemohon.toLowerCase() !== pm) return false
    if (f === 'dobel' ? !cek.dobel.has(r.tahun + ':' + r.nomor) : f === 'revisi' ? r.revisiKe < 1 : f === 'armada' ? r.alasan !== 'armada' : f === 'ttd' ? r.ttd : f !== 'semua' && s !== f) return false
    const t = q.trim().toLowerCase(); return !t || [r.nomor, r.mitra, r.tambang, r.pltu, r.bongkar, r.kapal, r.pemohon, r.transporter].join(' ').toLowerCase().includes(t)
  }).sort((a, b) => b.r.tahun - a.r.tahun || (b.r.nomor ?? 0) - (a.r.nomor ?? 0)), [rows, q, th, f, pm, today, sup, cek])
  const tahun = [...new Set(rows.map(r => r.tahun))].sort((a, b) => b - a); const pemohon = [...new Set(rows.map(r => r.pemohon.toLowerCase()).filter(Boolean))].sort()
  const ch: [string, string][] = [['semua', 'Semua'], ['lewat', 'Lewat laycan (≤30 hr)'],['arsip', 'Arsip'], ['segera', 'Laycan ≤3 hari'], ['aktif', 'Aktif'], ['revisi', 'Revisi'], ['armada', 'Revisi: armada diganti'], ['direvisi', 'Sudah direvisi'], ['dobel', 'Nomor dobel']]
  return <Card title={`Daftar SI (${data.length})`} right={<div className="flex gap-2 flex-wrap"><select value={th} onChange={e => setTh(e.target.value)} aria-label="Tahun"><option value="semua">Semua tahun</option>{tahun.map(t => <option key={t}>{t}</option>)}</select><select value={pm} onChange={e => setPm(e.target.value)} aria-label="Pemohon"><option value="">Semua pemohon</option>{pemohon.map(p => <option key={p} value={p}>{p}</option>)}</select><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nomor, tambang, PLTU, kapal…" className="w-[210px]" /></div>}>
    <div className="flex gap-1.5 flex-wrap mb-3">{ch.map(([v, l]) => <button key={v} className={'fchip' + (f === v ? ' on' : '')} onClick={() => setF(v)}>{l}</button>)}</div>
    <div className="overflow-x-auto"><table className="w-full text-xs min-w-[1080px]"><thead><tr className="text-slate-400 text-left">{['Nomor SI', 'Terbit', 'Pemohon', 'Sumber tambang', 'PLTU', 'Laycan', 'Status', 'Rev', 'Aksi'].map(h => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead><tbody>
      {data.slice(0, 300).map(({ r, s }) => { const m = masalah.get(r.id); return <><tr key={r.id} className="border-t border-white/5 hover:bg-white/[.03] cursor-pointer" onClick={() => setBuka(buka === r.id ? '' : r.id)}>
        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{fmtNomor(r.nomor, r.tahun)}{m && <span title={m.teks} className="ml-1 text-red-400">⚠</span>}</td>
        <td className="px-2 whitespace-nowrap">{r.tanggal ? tglId(r.tanggal) : '—'}</td><td className="px-2">{r.pemohon || '—'}</td><td className="px-2">{r.tambang || r.mitra || '—'}</td><td className="px-2">{r.bongkar || r.pltu || '—'}</td>
        <td className="px-2 whitespace-nowrap">{rentangId(r.laycanMulai, r.laycanSelesai) || r.laycanTeks || '—'}</td><td className="px-2"><Chip s={s} /></td>
        <td className="px-2 whitespace-nowrap">{r.revisiKe > 0 ? <span title={r.alasan ? ALASAN[r.alasan] : ''}>Rev-{r.revisiKe}{r.alasan === 'armada' ? ' 🚢' : ''}</span> : ''}{r.koreksi.length ? <span className="text-slate-400 ml-1" title="Ada koreksi penulisan">✎{r.koreksi.length}</span> : ''}</td>
        <td className="px-2 whitespace-nowrap text-right">{bisa && <><button className="fchip on" title="Revisi: nomor baru, tercatat apa yang berubah" onClick={e => { e.stopPropagation(); onAksi('revisi', r) }}>Revisi</button> <button className="fchip" title="Koreksi typo: nomor tetap" onClick={e => { e.stopPropagation(); onAksi('koreksi', r) }}>Koreksi</button> </>}<button className="fchip" title="Word dari template asli" onClick={e => { e.stopPropagation(); unduhDocx(r) }}>Word</button> <button className="fchip" onClick={e => { e.stopPropagation(); unduhPdf(r) }}>PDF</button></td></tr>
        {buka === r.id && <tr key={r.id + 'd'} className="bg-white/[.02]"><td colSpan={9} className="px-3 py-3"><Detail r={r} admin={admin} bisa={bisa} onAksi={onAksi} /></td></tr>}</>})}
      {!data.length && <tr><td colSpan={9} className="px-2 py-8 text-center text-slate-400">Tidak ada SI yang cocok.</td></tr>}</tbody></table></div>
    {data.length > 300 && <p className="text-[11px] text-slate-400 mt-2">Menampilkan 300 pertama — persempit dengan filter.</p>}
  </Card>
}
function Detail({ r, admin, bisa: boleh, onAksi }: { r: SI; admin: boolean; bisa: boolean; onAksi: (m: 'revisi' | 'koreksi', s: SI) => void }) {
  const { rows } = useSI(); const rt = rantai(rows, r); const bisa = r.sumber !== 'sheet-2026' || !!r.mitra
  return <div className="grid md:grid-cols-2 gap-4 text-[12px]">
    <div className="space-y-0.5"><div><span className="text-slate-400">Kapal:</span> {r.kapal || '—'}{r.moda ? ` (${r.moda})` : ''}</div><div><span className="text-slate-400">Volume:</span> {r.volume ?? '—'} ton</div><div><span className="text-slate-400">Muat:</span> {r.muat || '—'}</div><div><span className="text-slate-400">ETA:</span> {rentangId(r.etaMulai, r.etaSelesai) || r.etaTeks || '—'}</div><div><span className="text-slate-400">Transporter:</span> {r.transporter || '—'}</div><div><span className="text-slate-400">Shipper:</span> {r.mitra || '—'}</div>
      <div className="pt-2 flex gap-2 flex-wrap">{boleh && <><button className="fchip" onClick={() => onAksi('revisi', r)}>Revisi SI (nomor baru)</button><button className="fchip" onClick={() => onAksi('koreksi', r)}>Koreksi penulisan (nomor tetap)</button></>}{admin && r.tahap === 'terbit' && <button className="fchip" onClick={() => siActions.simpan({ ...r, ttd: !r.ttd })}>{r.ttd ? '✓ Sudah ttd Dirop' : 'Tandai sudah ttd'}</button>}</div>{!bisa && <p className="text-[11px] text-amber-300 pt-1">Data impor sheet belum lengkap — lengkapi lewat Koreksi/Revisi sebelum cetak PDF.</p>}</div>
    <div>{rt.length > 1 && <><div className="text-slate-400 mb-1">Rantai revisi</div><ol className="space-y-1">{rt.map(x => <li key={x.id} className={x.id === r.id ? 'font-semibold' : ''}>{fmtNomor(x.nomor, x.tahun)} — {x.revisiKe ? `Rev-${x.revisiKe}${x.alasan ? ' · ' + ALASAN[x.alasan] : ''}` : 'SI awal'}{x.perubahan.length > 0 && <ul className="text-slate-400 ml-4 list-disc">{x.perubahan.map((u, i) => <li key={i}>{u.label}: {u.dari} → <b className="text-slate-200">{u.ke}</b></li>)}</ul>}</li>)}</ol></>}
      {r.ketRevisi && <p className="mt-1 text-slate-300">Ket. revisi: {r.ketRevisi}</p>}
      {r.koreksi.length > 0 && <><div className="text-slate-400 mt-2 mb-1">Riwayat koreksi penulisan (bukan revisi)</div><ul className="list-disc ml-4">{r.koreksi.map((k, i) => <li key={i}>{new Date(k.at).toLocaleDateString('id-ID')} · {k.oleh}: {k.ubah.map(u => `${u.label} "${u.dari}"→"${u.ke}"`).join('; ')}</li>)}</ul></>}</div>
  </div>
}
export function Fld({ l, children, w }: { l: string; children: React.ReactNode; w?: string }) { return <label className={'block text-[11px] text-slate-400 ' + (w ?? '')}>{l}<div className="mt-0.5 text-slate-100 [&>input]:w-full [&>select]:w-full">{children}</div></label> }
export function Form({ v, set, kunci }: { v: SI; set: (s: SI) => void; kunci?: boolean }) {
  const ref = useRef_(); const { rows: semua } = useSI(); const tambangList = useMemo(() => [...new Set([...(ref?.mitra.map(x => x[0]) ?? []), ...semua.map(r => r.tambang)].map(x => (x || '').trim()).filter(x => x.length > 2))].sort(), [ref, semua]); const p = (k: Partial<SI>) => set({ ...v, ...k }); const t = (k: keyof SI) => ({ value: String(v[k] ?? ''), onChange: (e: any) => p({ [k]: e.target.value } as any) })
  const mt = (n: string) => { const m = ref?.mitra.find(x => x[0].toLowerCase() === n.toLowerCase()); p({ mitra: n, ...(m ? { kontrak: m[1] } : {}), ...(!v.tambang ? { tambang: n } : {}) }) }
  const tr = (n: string) => { const m = ref?.transport.find(x => x[0].toLowerCase() === n.toLowerCase()); p({ transporter: n, ...(m ? { kontrakTransport: m[1] } : {}) }) }
  const pl = (n: string) => { const m = ref?.pltu.find(x => x[0].toLowerCase() === n.toLowerCase()); p({ pltu: n, bongkar: n, ...(m ? { consignee: m[1].replace(/ \/ /g, '\n'), notify: m[2] } : {}) }) }
  const jt = (n: string) => { const m = ref?.jetty.find(x => x[0].toLowerCase() === n.toLowerCase()); p({ muat: m ? `${m[0]}, ${m[1]}` : n }) }
  return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
    <Fld l="Skema"><select {...t('skema')}><option>FOB</option><option>CIF</option><option>Freight</option></select></Fld>
    <Fld l="Pemohon"><input list="dl-pemohon" {...t('pemohon')} placeholder="pilih / ketik nama" /><datalist id="dl-pemohon">{['Andi', 'Billy', 'Racel', 'Rendi', 'Popi', 'Rully', 'Catur', 'Pras'].map(x => <option key={x} value={x} />)}</datalist></Fld>
    <Fld l="Jenis"><label className="mr-3"><input type="checkbox" checked={v.kelistrikan} onChange={e => p({ kelistrikan: e.target.checked })} /> Kelistrikan</label><label><input type="checkbox" checked={v.bib} onChange={e => p({ bib: e.target.checked })} /> BIB</label></Fld>
    <Fld l="Shipper / mitra batubara"><input list="dl-mitra" value={v.mitra} onChange={e => mt(e.target.value)} /></Fld>
    <Fld l="Kontrak PJBB"><input {...t('kontrak')} /></Fld>
    <Fld l="Sumber tambang"><input list="dl-tambang" {...t('tambang')} placeholder="pilih atau ketik sendiri" /></Fld>
    <Fld l="Transporter (Kepada)"><input list="dl-tr" value={v.transporter} onChange={e => tr(e.target.value)} /></Fld>
    <Fld l="Nama kapal / tongkang"><input {...t('kapal')} placeholder="TB … / BG …" /></Fld>
    <Fld l="Moda"><input list="dl-moda" {...t('moda')} /></Fld>
    <Fld l="Tropical draft (BIB, ton)"><input type="number" value={v.tropical ?? ''} onChange={e => p({ tropical: e.target.value === '' ? null : +e.target.value })} /></Fld>
    <Fld l="Volume (ton)"><input type="number" value={v.volume ?? ''} onChange={e => p({ volume: e.target.value === '' ? null : +e.target.value })} /></Fld>
    <Fld l="Pelabuhan muat (jetty)"><input list="dl-jetty" value={v.muat} onChange={e => jt(e.target.value)} /></Fld>
    <Fld l="PLTU tujuan"><input list="dl-pltu" value={v.pltu} onChange={e => pl(e.target.value)} /></Fld>
    <Fld l="Laycan mulai"><input type="date" {...t('laycanMulai')} /></Fld><Fld l="Laycan selesai"><input type="date" {...t('laycanSelesai')} /></Fld><div />
    <Fld l="ETA mulai"><input type="date" {...t('etaMulai')} /></Fld><Fld l="ETA selesai"><input type="date" {...t('etaSelesai')} /></Fld><div />
    <Fld l="Consignee (penerima barang)" w="sm:col-span-1"><textarea rows={3} className="w-full" {...t('consignee')} /><span className="block text-[10.5px] text-slate-500 mt-0.5">Nama PLTU / unit penerima batubara di dokumen pengapalan. Terisi otomatis dari PLTU tujuan.</span></Fld><Fld l="Notify address (alamat pemberitahuan)" w="sm:col-span-2"><textarea rows={3} className="w-full" {...t('notify')} /><span className="block text-[10.5px] text-slate-500 mt-0.5">Pihak &amp; alamat lengkap yang diberi tahu saat kapal tiba (biasanya operator PLTU / unit pelaksana). Terisi otomatis dari PLTU tujuan.</span></Fld>
    <datalist id="dl-tambang">{tambangList.map(x => <option key={x} value={x} />)}</datalist><datalist id="dl-mitra">{ref?.mitra.map(x => <option key={x[0]} value={x[0]} />)}</datalist><datalist id="dl-tr">{ref?.transport.map(x => <option key={x[0]} value={x[0].trim()} />)}</datalist><datalist id="dl-moda">{ref?.moda.map(x => <option key={x} value={x} />)}</datalist><datalist id="dl-jetty">{ref?.jetty.map(x => <option key={x[0]} value={x[0]} />)}</datalist><datalist id="dl-pltu">{ref?.pltu.map(x => <option key={x[0]} value={x[0]} />)}</datalist>
    {kunci && null}
  </div>
}
export const wajib = (s: SI) => { const e: string[] = []; if (!s.pemohon) e.push('pemohon'); if (!s.mitra) e.push('shipper'); if (s.skema === 'FOB' && !s.transporter) e.push('transporter'); if (!s.kapal) e.push('nama kapal'); if (!(s.volume && s.volume > 0)) e.push('volume'); if (!s.muat) e.push('pelabuhan muat'); if (!s.laycanMulai || !s.laycanSelesai) e.push('laycan'); else if (s.laycanSelesai < s.laycanMulai) e.push('laycan terbalik'); if (!s.etaMulai) e.push('ETA'); if (!s.pltu) e.push('PLTU'); return e }
function Antrean({ admin, onBuka, info }: { admin: boolean; onBuka: (s: SI) => void; info: (t: string) => void }) {
  const { rows } = useSI(); const antre = rows.filter(r => r.tahap === 'pengajuan')
  const terbit = async (r: SI) => { try { const n = await siActions.terbitkan(r, { tanggal: iso(new Date()) }); info(`SI terbit: ${fmtNomor(n.nomor, n.tahun)}. Unduh Word/PDF dari baris SI di tab Monitoring.`) } catch (e: any) { info(e.message || String(e)) } }
  return <Card title={`Antrean pengajuan (${antre.length})`}>{!antre.length ? <p className="text-xs text-slate-400">Tidak ada pengajuan menunggu. Klik <b>+ Buat SI</b> di kanan atas untuk membuat yang baru.</p> : <div className="space-y-1.5">{antre.map(r => <div key={r.id} className="flex items-center gap-2 text-xs border-t border-white/5 pt-1.5 flex-wrap"><b>{r.pemohon || '—'}</b><span>{r.tambang || r.mitra}</span><span className="text-slate-400">→ {r.pltu}</span><span className="text-slate-400">laycan {rentangId(r.laycanMulai, r.laycanSelesai)}</span><span className="flex-1" />
    <button className="fchip" onClick={() => onBuka(r)}>Buka / edit</button>{admin && <button className="fchip" onClick={() => terbit(r)}>Terbitkan</button>}<button className="fchip" onClick={() => siActions.hapusPengajuan(r.id)}>Hapus</button></div>)}</div>}</Card>
}
function Nomor({ admin }: { admin: boolean }) {
  const { rows, blok } = useSI(); const [th, setTh] = useState(new Date().getFullYear()); const cek = useMemo(() => periksa(rows, blok), [rows, blok]); const [n, setN] = useState(''); const [ket, setKet] = useState(''); const [msg, setMsg] = useState('')
  const celah = cek.celah[th] ?? []; const dobel = [...cek.dobel].filter(([k]) => k.startsWith(th + ':')); const tm = cek.masalah.filter(m => m.kind === 'tanggal-mundur' && rows.find(r => r.id === m.id)?.tahun === th)
  return <div className="space-y-3">
    <Card title="Penomoran" right={<select value={th} onChange={e => setTh(+e.target.value)}>{[...new Set([new Date().getFullYear(), ...rows.map(r => r.tahun)])].sort((a, b) => b - a).map(t => <option key={t}>{t}</option>)}</select>}>
      <div className="text-[12.5px] space-y-1"><div>Nomor berikutnya: <b className="font-mono">{fmtNomor(nomorBerikut(rows, blok, th), th)}</b></div><p className="text-slate-400 text-[11.5px]">Format <code>{'{nomor}.SI/EPI.03.01/DIR/{tahun}'}</code>; nomor mulai 1 tiap Januari. Nomor dipakai bersama surat Dirop lain, jadi celah wajar — sistem tidak mengisi celah, hanya selalu naik. Blok nomor yang dipakai surat lain agar tidak terpakai SI.</p></div></Card>
    <Card title={`Nomor dobel tahun ${th} (${dobel.length})`}>{!dobel.length ? <p className="text-xs text-emerald-400">Tidak ada nomor dobel.</p> : <ul className="text-xs space-y-1">{dobel.map(([k, v]) => <li key={k}><b className="font-mono">{k.split(':')[1]}</b> dipakai {v.length}×: {v.map(r => `${r.mitra || r.tambang || '—'} → ${r.pltu || '—'} (${r.tanggal || 'tgl ?'})`).join(' | ')}</li>)}</ul>}</Card>
    <Card title={`Nomor tidak urut dengan tanggal (${tm.length})`}>{!tm.length ? <p className="text-xs text-slate-400">Tidak ada.</p> : <ul className="text-xs space-y-1 max-h-60 overflow-auto">{tm.slice(0, 60).map(m => <li key={m.id}>{m.teks}</li>)}</ul>}</Card>
    <Card title={`Blok nomor (surat lain) & celah ${th}`}>
      {admin && <div className="flex gap-2 flex-wrap mb-2"><input value={n} onChange={e => setN(e.target.value)} placeholder="Nomor" className="w-[90px]" /><input value={ket} onChange={e => setKet(e.target.value)} placeholder="Dipakai untuk (mis. Nodin ke Direksi)" className="w-[260px]" /><button className="fchip" onClick={async () => { try { if (!+n) throw new Error('Isi nomor'); await siActions.blokir(th, +n, ket); setN(''); setKet(''); setMsg('') } catch (e: any) { setMsg(e.message) } }}>Blok nomor</button>{msg && <span className="text-red-400 text-xs">{msg}</span>}</div>}
      <div className="flex gap-1.5 flex-wrap mb-2">{blok.filter(b => b.tahun === th).sort((a, b) => a.nomor - b.nomor).map(b => <span key={b.nomor} className="fchip" title={b.ket}>{b.nomor}{admin && <b onClick={() => siActions.lepasBlok(th, b.nomor)}> ×</b>}</span>)}</div>
      <details><summary className="text-xs text-slate-400 cursor-pointer">Celah nomor ({celah.length}) — belum terpakai di registri SI</summary><p className="text-[11px] text-slate-400 mt-1 break-words">{celah.slice(-400).join(', ') || '—'}</p></details></Card>
  </div>
}
function Sinkron({ admin }: { admin: boolean }) {
  const st = useSI(); const [u, setU] = useState(st.remote); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const impor = async () => { setBusy(true); setMsg('Memuat…'); try {
    const db = (await (await fetch(B + 'si/databas-si.json')).json()); let sheet: SI[] = []
    try { const src = (await import('../config/sources')) as any; const url = (src.SI_CSV_URL as string) ?? ''; if (url) sheet = dariSheet(await (await fetch(url)).text()) } catch { /* sheet opsional */ }
    const all = gabung(dariDatabas(db), sheet); const pakai = new Map(st.rows.filter(r => r.sumber === 'sistem').map(r => [r.id, r])); const merged = [...all, ...pakai.values()]
    siActions.setAll(merged); if (st.remote) await siActions.dorong(merged); setMsg(`Impor ${all.length} SI (Databas ${db.length}, sheet 2026 tambahan ${sheet.length ? all.length - db.length : 0}).`) } catch (e: any) { setMsg('Gagal: ' + (e.message || e)) } setBusy(false) }
  return <div className="space-y-3">
    <Card title="Impor riwayat SI">
      <p className="text-xs text-slate-300 mb-2">Memuat arsip <b>Databas SI</b> (2024–16 Nov 2026) dan nomor terbaru dari sheet SI 2026 (Andi/Billy). Setelah itu nomor berikutnya mengikuti nomor tertinggi yang sudah terpakai.</p>
      {admin ? <button className="fchip on" disabled={busy} onClick={impor}>Impor / perbarui riwayat</button> : <span className="text-xs text-slate-400">Hanya admin.</span>} {msg && <span className="text-xs ml-2">{msg}</span>}</Card>
    <Card title="Penyimpanan bersama (anti-dobel antar pengguna)">
      <p className="text-xs text-slate-300 mb-2">Tanpa server, data SI hanya tersimpan <b>di browser ini</b> — dua orang bisa mendapat nomor yang sama. Untuk penomoran satu pintu, tempel URL Web App Apps Script di bawah (kode dan langkah ada di bawahnya). Server memberi nomor secara atomik (LockService).</p>
      <div className="flex gap-2 flex-wrap items-center"><input className="w-full sm:w-[480px]" value={u} onChange={e => setU(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" /><button className="fchip" onClick={() => { siActions.setRemote(u); if (u) siActions.tarik() }}>Simpan &amp; tarik data</button>{st.remote && <button className="fchip" onClick={() => siActions.tarik()}>Tarik ulang</button>}</div>
      <p className="text-[11.5px] mt-2">Status: {st.remote ? (st.sync === 'ok' ? <span className="text-emerald-400">tersambung{st.at ? ' · ' + new Date(st.at).toLocaleTimeString('id-ID') : ''}</span> : st.sync === 'gagal' ? <span className="text-red-400">gagal: {st.err}</span> : st.sync === 'proses' ? 'memproses…' : 'belum ditarik') : <span className="text-amber-300">mode lokal (browser ini)</span>}</p>
      <details className="mt-3"><summary className="text-xs cursor-pointer text-slate-300">Kode Apps Script &amp; cara pasang</summary><ol className="text-[11.5px] text-slate-300 list-decimal ml-4 my-2 space-y-0.5"><li>Buat Google Sheet kosong baru (mis. “Registri SI PLN BBN”). Extensions → Apps Script.</li><li>Tempel kode di bawah, simpan.</li><li>Deploy → New deployment → Web app → Execute as: <b>Me</b>, Who has access: <b>Anyone</b> (atau Anyone with the link).</li><li>Salin URL <code>/exec</code>, tempel di kolom di atas, lalu “Impor / perbarui riwayat” untuk mengisi registri.</li></ol><pre className="text-[10.5px] bg-black/30 rounded-lg p-2 overflow-auto max-h-72">{APPS_SCRIPT}</pre></details></Card>
    <Card title="Data lokal"><button className="fchip" onClick={() => { if (confirm('Hapus semua data SI di browser ini? (tidak menghapus data di server)')) siActions.reset() }}>Kosongkan data lokal</button></Card>
  </div>
}
