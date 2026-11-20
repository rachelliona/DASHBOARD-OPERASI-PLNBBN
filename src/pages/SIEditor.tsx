import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { PageHead } from '../components/ui'
import { useAuth } from '../auth'
import { isAdmin } from '../config/nav'
import { useSI, siActions } from '../si/store'
import { ALASAN, Alasan, SI, kosong } from '../si/types'
import { bandingkan, cekKoreksi, fmtNomor, FIELDS, iso, rentangId } from '../si/logic'
import { buatPdf, unduhPdf } from '../si/pdf'
import { getParaf, setParaf, unduhDocx } from '../si/docx'
import { Fld, Form, wajib } from './SI'
type Mode = 'baru' | 'edit' | 'revisi' | 'koreksi'
const tambah = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const KD = 'pln-si-draft-v1'
const bacaDraft = (k: string): SI | null => { try { const j = JSON.parse(localStorage.getItem(KD) || '{}'); return j[k] ?? null } catch { return null } }
const tulisDraft = (k: string, v: SI | null) => { try { const j = JSON.parse(localStorage.getItem(KD) || '{}'); if (v) j[k] = v; else delete j[k]; localStorage.setItem(KD, JSON.stringify(j)) } catch { /* abaikan */ } }
/** Salin SI lama sebagai bahan SI baru: data tetap (mitra, tujuan, dll) dipertahankan, data per-kapal dikosongkan. */
export const salinUntukBaru = (r: SI): SI => ({ ...kosong(), ...r, id: '', tahap: 'pengajuan', nomor: null, tahun: new Date().getFullYear(), tanggal: '', kapal: '', volume: null, laycanMulai: '', laycanSelesai: '', laycanTeks: '', etaMulai: '', etaSelesai: '', etaTeks: '', revisiKe: 0, sebelumnyaId: '', sebelumnyaNomor: null, alasan: '', ketRevisi: '', perubahan: [], koreksi: [], ttd: false, sumber: 'sistem', dibuat: '', dibuatOleh: '', diubah: '' })
const JUDUL: Record<Mode, string> = { baru: 'Buat SI baru', edit: 'Edit pengajuan SI', revisi: 'Revisi SI', koreksi: 'Koreksi penulisan' }
export default function SIEditor({ mode }: { mode: Mode }) {
  const { id } = useParams(); const nav = useNavigate(); const st = useSI(); const { user } = useAuth(); const admin = isAdmin(user); const nama = user?.nama || user?.id || ''
  const lama = id ? st.rows.find(r => r.id === id) : undefined; const key = mode === 'baru' ? 'new' : `${mode}:${id}`
  const awal = useMemo<SI>(() => { const d = bacaDraft(key); if (d) return d; if (mode === 'baru') return { ...kosong(), pemohon: /andi|billy|racel|rendi/i.exec(nama)?.[0].replace(/^./, c => c.toUpperCase()) ?? '' }; return lama ? { ...lama, ...(mode === 'revisi' ? { alasan: '' as const, ketRevisi: '' } : {}) } : kosong() }, [key]) // eslint-disable-line
  const [v, setV] = useState<SI>(awal); const [sisi, setSisi] = useState<'form' | 'preview'>('form'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [selesai, setSelesai] = useState<{ si: SI; teks: string } | null>(null)
  const [paraf, setP] = useState(getParaf()); const [blob, setBlob] = useState<Blob | null>(null); const [prevErr, setPrevErr] = useState(''); const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => { setV(awal) }, [awal])
  // simpan otomatis sebagai draft supaya tidak hilang walau halaman tertutup / salah klik
  useEffect(() => { const t = setTimeout(() => { if (!selesai) tulisDraft(key, v) }, 400); return () => clearTimeout(t) }, [v, key, selesai])
  // laycan 3 hari & ETA 2 hari terisi otomatis saat tanggal mulai dipilih (bisa diubah)
  useEffect(() => { if (v.laycanMulai && !v.laycanSelesai) setV(x => ({ ...x, laycanSelesai: tambah(x.laycanMulai, 2) })) }, [v.laycanMulai]) // eslint-disable-line
  useEffect(() => { if (v.etaMulai && !v.etaSelesai) setV(x => ({ ...x, etaSelesai: tambah(x.etaMulai, 1) })) }, [v.etaMulai]) // eslint-disable-line
  const ub = lama && (mode === 'revisi' || mode === 'koreksi') ? bandingkan(lama, v).filter(u => u.f !== 'tanggal') : []
  const kor = lama && mode === 'koreksi' ? cekKoreksi(lama, v) : null
  const penting = ub.some(u => FIELDS.find(f => f.f === u.f)?.penting)
  const prev = useMemo<SI>(() => {
    const x: SI = { ...v, mitra: v.mitra || '…', muat: v.muat || '…', laycanTeks: v.laycanMulai ? v.laycanTeks : '…', tanggal: v.tanggal || iso(new Date()) }
    if (mode === 'revisi' && lama) return { ...x, nomor: null, revisiKe: lama.revisiKe + 1, sebelumnyaNomor: lama.nomor, perubahan: ub, tanggal: iso(new Date()) }
    if (mode === 'koreksi' && lama) return { ...x, nomor: lama.nomor, tahun: lama.tahun, tanggal: lama.tanggal, revisiKe: lama.revisiKe, sebelumnyaNomor: lama.sebelumnyaNomor, alasan: lama.alasan, perubahan: lama.perubahan }
    return { ...x, nomor: v.nomor }
  }, [v, mode, lama]) // eslint-disable-line
  // pratinjau langsung: dirender ulang ~0,6 detik setelah berhenti mengetik; tidak perlu data lengkap
  const seq = useRef(0)
  useEffect(() => { const n = ++seq.current; const t = setTimeout(async () => { try { const { blob } = await buatPdf(prev, false, paraf); if (n !== seq.current) return; setPrevErr(''); setBlob(blob) } catch (e: any) { setPrevErr(String(e?.message || e)) } }, 600); return () => clearTimeout(t) }, [prev, paraf])
  useEffect(() => { // gambar halaman 1 ke canvas (pdf.js) — tidak bergantung pada PDF viewer browser dan tidak memicu unduhan
    if (!blob) return; let batal = false
    ;(async () => { try { const pdfjs = await import('pdfjs-dist'); if (!pdfjs.GlobalWorkerOptions.workerPort) { const W = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default; pdfjs.GlobalWorkerOptions.workerPort = new W() }
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; const page = await doc.getPage(1); const vp = page.getViewport({ scale: 2.2 }); if (batal || !cv.current) return
      const c = cv.current; const off = document.createElement('canvas'); off.width = vp.width; off.height = vp.height; await page.render({ canvasContext: off.getContext('2d')!, viewport: vp }).promise; if (batal) return
      c.width = vp.width; c.height = vp.height; c.getContext('2d')!.drawImage(off, 0, 0); doc.destroy() } catch (e: any) { if (!batal) setPrevErr('Pratinjau gagal dimuat: ' + String(e?.message || e)) } })(); return () => { batal = true } }, [blob])
  useEffect(() => () => { seq.current++ }, [])
  const kurang = wajib(v)
  const jalan = async (fn: () => Promise<{ si: SI; teks: string }>) => { setBusy(true); setMsg(''); try { const r = await fn(); tulisDraft(key, null); setSelesai(r) } catch (e: any) { setMsg(e.message || String(e)) } setBusy(false) }
  const unduhSemua = async (n: SI) => { await unduhDocx(n); await unduhPdf(n) }
  const ajukan = () => jalan(async () => { if (kurang.length) throw new Error('Lengkapi dulu: ' + kurang.join(', ')); const s = v.id ? (await siActions.simpan(v), v) : await siActions.ajukan(v, nama); return { si: s, teks: 'Pengajuan tersimpan di antrean. Racel akan memeriksa lalu menerbitkan nomor.' } })
  const terbit = () => jalan(async () => { if (kurang.length) throw new Error('Lengkapi dulu: ' + kurang.join(', ')); const n = await siActions.terbitkan({ ...v, id: v.id || 'si-' + Date.now().toString(36), dibuatOleh: v.dibuatOleh || nama }, { tanggal: iso(new Date()) }); await unduhSemua(n); return { si: n, teks: `SI terbit: ${fmtNomor(n.nomor, n.tahun)} — Word & PDF sudah diunduh.` } })
  const revisi = () => jalan(async () => { const n = await siActions.revisi(lama!, v, nama); await unduhSemua(n); return { si: n, teks: `Revisi terbit: ${fmtNomor(n.nomor, n.tahun)} — Word & PDF sudah diunduh.` } })
  const koreksi = () => jalan(async () => { const n = await siActions.koreksi(lama!, v, nama); await unduhSemua(n); return { si: n, teks: `Koreksi tersimpan, nomor tetap ${fmtNomor(n.nomor, n.tahun)} — Word & PDF dicetak ulang.` } })
  const dariSebelumnya = (txt: string) => { const r = st.rows.find(x => x.nomor != null && txt.startsWith(String(x.nomor) + ' ')); if (r) setV({ ...salinUntukBaru(r), pemohon: v.pemohon || r.pemohon }) }
  const recent = useMemo(() => st.rows.filter(r => r.tahap !== 'pengajuan' && r.nomor != null && r.mitra).sort((a, b) => (b.tahun - a.tahun) || ((b.nomor ?? 0) - (a.nomor ?? 0))).slice(0, 60), [st.rows])
  if ((mode !== 'baru') && !lama) return <><PageHead icon={FileText} title={JUDUL[mode]} month={false} sub="" /><p className="text-sm">SI tidak ditemukan. <Link className="underline" to="/si">Kembali ke daftar SI</Link></p></>
  if (selesai) return <><PageHead icon={FileText} title="Selesai" month={false} sub="" />
    <div className="gcard max-w-[640px]"><p className="text-emerald-400 font-semibold mb-3">{selesai.teks}</p>
      <div className="flex gap-2 flex-wrap"><button className="fchip on !px-4 !py-2" onClick={() => { const c = { ...salinUntukBaru(selesai.si), pemohon: selesai.si.pemohon }; tulisDraft('new', c); setSelesai(null); setMsg(''); setV(c); nav('/si/baru', { replace: true }) }}>Buat SI berikutnya (data sama, kapal & laycan dikosongkan)</button>
        <button className="fchip !px-4 !py-2" onClick={() => { const c = { ...kosong(), pemohon: selesai.si.pemohon }; tulisDraft('new', c); setSelesai(null); setV(c); nav('/si/baru', { replace: true }) }}>SI baru kosong</button>
        {selesai.si.tahap === 'terbit' && <><button className="fchip !px-4 !py-2" onClick={() => unduhDocx(selesai.si)}>Unduh Word lagi</button><button className="fchip !px-4 !py-2" onClick={() => unduhPdf(selesai.si)}>Unduh PDF lagi</button></>}
        <Link className="fchip !px-4 !py-2" to="/si">Kembali ke daftar</Link></div></div></>
  return <>
    <PageHead icon={FileText} title={JUDUL[mode] + (lama?.nomor != null && mode !== 'baru' && mode !== 'edit' ? ` — ${fmtNomor(lama.nomor, lama.tahun)}` : '')} month={false} sub="Pratinjau di kanan ikut berubah saat kamu mengisi — tidak perlu lengkap dulu. Isian tersimpan otomatis sebagai draft." right={<Link className="fchip" to="/si">← Daftar SI</Link>} />
    <div className="lg:hidden"><div className="vsw mb-3"><button className={'vsw-b' + (sisi === 'form' ? ' on' : '')} onClick={() => setSisi('form')}>Isi data</button><button className={'vsw-b' + (sisi === 'preview' ? ' on' : '')} onClick={() => setSisi('preview')}>Pratinjau</button></div></div>
    <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-4 items-start">
      <div className={'gcard ' + (sisi === 'preview' ? 'hidden lg:block' : '')}>
        {mode === 'revisi' && <p className="text-[11.5px] text-slate-300 mb-3 rounded-lg bg-violet-400/10 border border-violet-400/30 px-3 py-2">Ubah bagian yang berubah (mis. nama kapal). SI revisi mendapat <b>nomor baru</b> dan menaut ke {fmtNomor(lama!.nomor, lama!.tahun)}; yang berubah dicatat otomatis.</p>}
        {mode === 'koreksi' && <p className="text-[11.5px] text-slate-300 mb-3 rounded-lg bg-sky-400/10 border border-sky-400/30 px-3 py-2">Hanya untuk salah ketik. <b>Nomor tetap</b>, dokumen dicetak ulang, tercatat di riwayat koreksi. Kapal, volume, laycan, atau ETA yang berubah = Revisi.</p>}
        {mode === 'baru' && recent.length > 0 && <div className="mb-3"><Fld l="Mulai dari SI sebelumnya (opsional — menyalin mitra, tujuan, consignee; kapal & laycan dikosongkan)"><input list="dl-recent" placeholder="ketik nomor / mitra / PLTU, lalu pilih" onChange={e => dariSebelumnya(e.target.value)} /></Fld><datalist id="dl-recent">{recent.map(r => <option key={r.id} value={`${r.nomor} · ${r.mitra} → ${r.bongkar || r.pltu}`} />)}</datalist></div>}
        <Form v={v} set={setV} />
        {mode === 'revisi' && <div className="grid sm:grid-cols-3 gap-2.5 mt-3"><Fld l="Alasan revisi"><select value={v.alasan} onChange={e => setV({ ...v, alasan: e.target.value as Alasan })}><option value="">— pilih —</option>{Object.entries(ALASAN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Fld><Fld l="Keterangan revisi" w="sm:col-span-2"><input value={v.ketRevisi} onChange={e => setV({ ...v, ketRevisi: e.target.value })} placeholder="mis. TB … diganti TB … karena mesin trouble" /></Fld></div>}
        {(mode === 'revisi' || mode === 'koreksi') && <div className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-[12px]"><div className="font-semibold mb-1">Yang berubah ({ub.length})</div>{!ub.length ? <span className="text-slate-400">Belum ada perubahan.</span> : <ul className="space-y-0.5">{ub.map(u => <li key={u.f}>{u.label}: <span className="text-slate-400">{u.dari}</span> → <b>{u.ke}</b>{kor?.tolak.some(t => t.f === u.f) && <span className="text-red-400 ml-2">bukan typo → pakai Revisi</span>}</li>)}</ul>}{mode === 'revisi' && ub.length > 0 && !penting && <p className="text-amber-300 mt-1">Perubahan kecil — kalau hanya typo, pakai Koreksi penulisan.</p>}</div>}
        {msg && <p className="text-red-400 text-[12.5px] mt-3">{msg}</p>}
        <div className="sticky bottom-0 -mx-1 mt-4 pt-3 pb-1 flex gap-2 flex-wrap items-center border-t border-white/10 bg-[var(--s1,#12161d)]">
          {kurang.length > 0 && (mode === 'baru' || mode === 'edit') && <span className="text-[11px] text-slate-400">Belum lengkap: {kurang.join(', ')}</span>}<span className="flex-1" />
          {(mode === 'baru' || mode === 'edit') && <><button className="fchip !px-4 !py-2" disabled={busy} onClick={ajukan}>{admin ? 'Simpan ke antrean' : 'Ajukan ke Racel'}</button>{admin && <button className="fchip on !px-5 !py-2 !text-[14px]" disabled={busy} onClick={terbit}>Terbitkan nomor &amp; unduh</button>}</>}
          {mode === 'revisi' && (admin ? <button className="fchip on !px-5 !py-2 !text-[14px]" disabled={busy || !ub.length} onClick={revisi}>Terbitkan revisi &amp; unduh</button> : <span className="text-[11.5px] text-slate-400">Penerbitan revisi dilakukan Racel.</span>)}
          {mode === 'koreksi' && (admin ? <button className="fchip on !px-5 !py-2 !text-[14px]" disabled={busy || !ub.length || (kor ? !kor.ok : false)} onClick={koreksi}>Simpan koreksi &amp; unduh</button> : <span className="text-[11.5px] text-slate-400">Koreksi dilakukan Racel.</span>)}
        </div>
      </div>
      <div className={'lg:sticky lg:top-3 ' + (sisi === 'form' ? 'hidden lg:block' : '')}>
        <div className="gcard !p-2">
          <div className="flex items-center gap-2 px-2 pt-1 pb-2 text-[11.5px] flex-wrap"><b>Pratinjau</b><span className="text-slate-400">tampilan PDF</span><span className="flex-1" />
            {(['ada', 'kosong'] as const).map(p => <button key={p} className={'fchip' + (paraf === p ? ' on' : '')} onClick={() => { setParaf(p); setP(p) }}>{p === 'ada' ? 'Dengan paraf' : 'Kosongan'}</button>)}
            <button className="fchip" onClick={() => unduhDocx(prev)}>Word</button><button className="fchip" onClick={() => unduhPdf(prev, true)}>PDF draft</button></div>
          <canvas ref={cv} aria-label="Pratinjau SI" className="w-full h-auto rounded-lg bg-white block" style={{ aspectRatio: '210 / 297' }} />{!blob && <div className="text-xs text-slate-400 p-3">Menyiapkan pratinjau…</div>}
          {prevErr && <p className="text-[11px] text-red-400 px-2">{prevErr}</p>}
          <p className="text-[10.5px] text-slate-500 px-2 pt-1">Bagian yang belum diisi tampil sebagai “…”. Nomor SI diberikan saat diterbitkan.</p>
        </div>
      </div>
    </div>
  </>
}
