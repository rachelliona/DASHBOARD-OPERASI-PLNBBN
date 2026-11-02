import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../auth'
import { Btn } from '../components/ui'
export default function Login() {
  const { login } = useAuth(); const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); setErr(''); const e = await login(id, pw); if (e) setErr(e); setBusy(false) }
  return <div className="min-h-screen grid md:grid-cols-[1.2fr_1fr]">
    <div className="hidden md:flex flex-col justify-between p-10" style={{ background: 'radial-gradient(700px 500px at 20% 10%,rgba(230,180,87,.22),transparent 60%),radial-gradient(600px 500px at 90% 90%,rgba(167,139,250,.18),transparent 60%),#0c0f14' }}>
      <div className="flex items-center gap-3"><span className="logo"><Zap size={18} strokeWidth={2.5} /></span><b className="text-sm">PLN Batubara Niaga</b></div>
      <div><h1 className="text-3xl font-bold leading-tight num">Dashboard Operasi<br />PLN Batubara Niaga</h1><p className="text-sm text-slate-300 mt-3 max-w-md">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi — dari carry over sampai unloading, dalam satu tampilan.</p>
        <div className="flex flex-wrap gap-2 mt-6 text-xs">{['Peta shipment', 'Laporan harian', 'Linimasa keterlambatan', 'Riwayat per tanggal'].map(t => <span key={t} className="badge">{t}</span>)}</div></div>
      <p className="text-[11px] text-slate-500">Akses internal Direktorat Operasi.</p></div>
    <div className="flex items-center justify-center p-6"><div className="w-full max-w-xs">
      <h2 className="text-lg font-bold mb-1">Masuk</h2><p className="text-xs text-slate-400 mb-4">Gunakan User ID dan password yang terdaftar.</p>
      <div role="group" aria-label="Masuk" className="grid gap-3">
        <label className="text-xs">User ID<input className="w-full mt-1" autoComplete="username" value={id} onChange={e => setId(e.target.value)} /></label>
        <label className="text-xs">Password<input className="w-full mt-1" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && submit()} /></label>
        {err && <p role="alert" className="text-xs text-amber-300">{err}</p>}
        <Btn disabled={busy || !id || !pw} onClick={submit} className="!py-2">{busy ? 'Memeriksa…' : 'Masuk'}</Btn></div>
      <p className="text-[11px] text-slate-500 mt-4">Gerbang ini membatasi tampilan dashboard; data pada sheet sumber tetap mengikuti pengaturan berbagi Google Sheets.</p>
      <Link className="text-[11px] text-[#e6b457] underline" to="/buat-hash">Buat Hash Password</Link></div></div></div>
}
