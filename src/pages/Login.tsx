import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Btn } from '../components/ui'
export default function Login() {
  const { login } = useAuth(); const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); setErr(''); const e = await login(id, pw); if (e) setErr(e); setBusy(false) }
  return <div className="min-h-screen login-bg flex flex-col items-center justify-center p-6 relative" style={{ background: 'radial-gradient(700px 500px at 15% 5%,rgba(230,180,87,.22),transparent 60%),radial-gradient(600px 500px at 90% 95%,rgba(167,139,250,.18),transparent 60%),#0c0f14' }}>
    <div className="logo-plate login-logo login-corner"><img src={import.meta.env.BASE_URL + 'logo-dark.png'} alt="PLN Batubara Niaga" className="logo-full" /></div>
    <div className="w-full max-w-xl login-card">
      <div className="text-center mb-6"><h1 className="text-3xl font-bold leading-tight num">Dashboard Operasi<br />PLN Batubara Niaga</h1><p className="text-sm text-slate-400 mt-3">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p></div>
      <h2 className="text-lg font-bold mb-1">Masuk</h2><p className="text-xs text-slate-400 mb-5">Gunakan User ID dan password yang terdaftar.</p>
      <div role="group" aria-label="Masuk" className="grid gap-3">
        <label className="text-xs">User ID<input className="w-full mt-1" autoComplete="username" value={id} onChange={e => setId(e.target.value)} /></label>
        <label className="text-xs">Password<input className="w-full mt-1" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && submit()} /></label>
        {err && <p role="alert" className="text-xs text-amber-300">{err}</p>}
        <Btn disabled={busy || !id || !pw} onClick={submit} className="!py-2">{busy ? 'Memeriksa…' : 'Masuk'}</Btn></div>
      <p className="text-[11px] text-slate-500 mt-4">Gerbang ini membatasi tampilan dashboard; data pada sheet sumber tetap mengikuti pengaturan berbagi Google Sheets.</p>
      <Link className="text-[11px] text-[#e6b457] underline" to="/buat-hash">Buat Hash Password</Link></div>
    <p className="text-[11px] text-slate-500 mt-6">Akses internal Direktorat Operasi.</p></div>
}
