import { useKontrak, syncKontrak } from '../kontrakStore'
import { KONTRAK_SHEET_LINK, KONTRAK_SHEET_TAB } from '../domain/kontrakSheet'
/** Keterangan sumber data kontrak (Google Sheet Database Kontrak) + tombol sinkron. */
export default function KontrakSumber({ edit }: { edit?: boolean }) {
  const k = useKontrak(); const jam = k.at ? new Date(k.at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  const warna = k.sumber === 'sheet' ? '#34d399' : k.sumber === 'lokal' ? '#fbbf24' : '#94a3b8'
  return <div className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border px-3 py-2 text-[12px]" style={{ borderColor: warna + '55', background: warna + '12' }}>
    <i className="w-2 h-2 rounded-full" style={{ background: warna }} />
    {k.sumber === 'sheet' ? <span>Otomatis dari Google Sheet <b>Database Kontrak</b> (tab {KONTRAK_SHEET_TAB}) · {k.rows.length} baris · diperbarui {jam}</span>
      : k.sumber === 'lokal' ? <span>Ada perubahan lokal di browser ini (belum ada di sheet). Akan tertimpa saat sinkron dengan sheet.</span>
      : <span>{k.memuat ? 'Mengambil data kontrak dari Google Sheet…' : `Memakai data bawaan${k.err ? ' — sheet gagal dimuat: ' + k.err : ''}.`}</span>}
    {edit && k.sumber === 'sheet' && <span className="text-slate-400">Ubah data di sheet agar permanen dan terlihat semua orang; edit di halaman ini hanya sementara.</span>}
    <span className="ml-auto flex gap-2"><button className="pbtn" disabled={k.memuat} onClick={() => syncKontrak(true)}>{k.memuat ? 'Sinkron…' : 'Sinkron sekarang'}</button><a className="pbtn" href={KONTRAK_SHEET_LINK} target="_blank" rel="noreferrer">Buka sheet ↗</a></span></div>
}
