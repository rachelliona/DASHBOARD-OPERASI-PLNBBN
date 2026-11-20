import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bisaBuatSI } from '../config/nav'

const KEY = 'pln-welcome-v1'

/** Popup info yang muncul tiap kali halaman dibuka / di-refresh (sekali per muat). */
export function WelcomePopup({ user }: { user: any }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } })
  const [jangan, setJangan] = useState(false)
  const tutup = () => { if (jangan) { try { localStorage.setItem(KEY, 'off') } catch { /* tanpa penyimpanan */ } } setOpen(false) }
  useEffect(() => { if (!open) return; const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f) }, [open])
  if (!open || !user) return null
  const bisa = bisaBuatSI(user)
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Info dashboard" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--s1,#12161d)', color: 'var(--tx,#e8ecf2)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, maxWidth: 420, width: '100%', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: 12, opacity: .65, letterSpacing: .4 }}>MENU BARU</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 10px' }}>Shipping Instruction kini ada di dashboard</h2>
        <ul style={{ fontSize: 13.5, lineHeight: 1.55, paddingLeft: 18, margin: 0, opacity: .92 }}>
          <li>Pantau nomor, tanggal terbit, laycan, sumber tambang &amp; PLTU dalam satu tabel.</li>
          <li>Deteksi nomor dobel/celah dan SI yang sudah lewat laycan.</li>
          <li>Ganti kapal = <b>Revisi</b> (nomor baru, tercatat apa yang berubah); salah ketik = <b>Koreksi</b> (nomor tetap).</li>
          <li>Unduh PDF kapan saja; Word (template) setelah SI terbit.</li>
          {bisa && <li>Buat SI dengan pratinjau di samping; draft tersimpan otomatis.</li>}
        </ul>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, marginTop: 14, opacity: .8, cursor: 'pointer' }}>
          <input type="checkbox" checked={jangan} onChange={e => setJangan(e.target.checked)} /> Jangan tampilkan lagi
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={tutup} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.18)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>Tutup</button>
          <button onClick={() => { tutup(); nav('/si') }} style={{ padding: '8px 14px', borderRadius: 8, border: 0, background: '#1f9fd6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Buka Shipping Instruction</button>
        </div>
      </div>
    </div>
  )
}
