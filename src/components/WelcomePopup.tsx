import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const KEY = 'pln-welcome-v2'
const PINTAS: [string, string][] = [['Ringkasan', '/'], ['Peta Shipment', '/peta'], ['Laporan Harian', '/laporan/harian'], ['Shipping Instruction', '/si'], ['Analisis', '/analisis'], ['Kontrak', '/kontrak'], ['Kinerja Mitra', '/kinerja-mitra'], ['Gantt Pasokan', '/gantt']]

/** Popup umum yang muncul tiap dashboard dibuka / di-refresh (sekali per muat). */
export function WelcomePopup({ user }: { user: any }) {
  const nav = useNavigate(); const st: any = useStore()
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } })
  const [jangan, setJangan] = useState(false)
  const tutup = () => { if (jangan) { try { localStorage.setItem(KEY, 'off') } catch { /* tanpa penyimpanan */ } } setOpen(false) }
  useEffect(() => { if (!open) return; const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [open])
  if (!open || !user) return null
  const h = new Date().getHours(), sapa = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'
  const n = st.monthly?.ships?.length
  const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const pergi = (to: string) => { setOpen(false); nav(to) }
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Info dashboard" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--s1,#12161d)', color: 'var(--tx,#e8ecf2)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, maxWidth: 440, width: '100%', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: 12, opacity: .65 }}>{tgl}</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 6px' }}>{sapa}, {user.nama || user.id}</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, opacity: .9 }}>
          Dashboard Operasi PLN Batubara Niaga.{st.bulanAktif ? <> Data aktif: <b>{st.bulanAktif}</b>{n ? <> ({n} shipment)</> : null}.</> : null} Data diambil langsung dari Google Sheet dan diperbarui otomatis.
        </p>
        <div style={{ fontSize: 12, opacity: .65, margin: '14px 0 6px' }}>MENU CEPAT</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PINTAS.map(([l, to]) => <button key={to} onClick={() => pergi(to)} style={{ padding: '6px 11px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.05)', color: 'inherit', fontSize: 12.5, cursor: 'pointer' }}>{l}</button>)}
        </div>
        <ul style={{ fontSize: 12.5, lineHeight: 1.55, paddingLeft: 18, margin: '14px 0 0', opacity: .8 }}>
          <li>Cari cepat PLTU / No. SI: tekan <b>Ctrl+K</b> (atau ikon cari di HP).</li>
          <li>Di HP, tarik layar ke bawah untuk memperbarui data.</li>
        </ul>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, marginTop: 14, opacity: .8, cursor: 'pointer' }}>
          <input type="checkbox" checked={jangan} onChange={e => setJangan(e.target.checked)} /> Jangan tampilkan lagi
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={tutup} style={{ padding: '8px 18px', borderRadius: 8, border: 0, background: '#1f9fd6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Mulai</button>
        </div>
      </div>
    </div>
  )
}
