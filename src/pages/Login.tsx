import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Btn } from '../components/ui'
export default function Login() {
  const { login } = useAuth(); const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); setErr(''); const e = await login(id, pw); if (e) setErr(e); setBusy(false) }
  return <div className="min-h-screen flex items-center justify-center p-4"><div className="w-full max-w-xs rounded-lg border border-white/10 bg-[#171a21] p-5">
    <h1 className="text-base font-bold">Dashboard Operasi PLN Batubara Niaga</h1><p className="text-xs text-slate-400 mb-4">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p>
    <div role="group" aria-label="Masuk" className="grid gap-2">
      <label className="text-xs">User ID<input className="w-full" autoComplete="username" value={id} onChange={e => setId(e.target.value)} /></label>
      <label className="text-xs">Password<input className="w-full" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && submit()} /></label>
      {err && <p role="alert" className="text-xs text-amber-300">{err}</p>}
      <Btn disabled={busy || !id || !pw} onClick={submit}>{busy ? 'Memeriksa…' : 'Masuk'}</Btn></div>
    <p className="text-[11px] text-slate-500 mt-4">Akses internal. Gerbang ini membatasi tampilan dashboard; data pada sheet sumber tetap mengikuti pengaturan berbagi Google Sheets.</p>
    <Link className="text-[11px] text-[#e6b457] underline" to="/buat-hash">Buat Hash Password</Link></div></div>
}
