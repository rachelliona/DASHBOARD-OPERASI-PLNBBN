import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Btn } from '../components/ui'
import { Moon, Sun } from 'lucide-react'
import { setTheme, useTheme } from '../theme'
export default function Login() {
  const { login } = useAuth(); const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const idRef = useRef<HTMLInputElement>(null), pwRef = useRef<HTMLInputElement>(null), tried = useRef('')
  /** Baca nilai langsung dari kolom (bukan state) supaya isian otomatis Safari/iCloud Keychain ikut terbaca. */
  const submit = async () => { const u = idRef.current?.value ?? id, w = pwRef.current?.value ?? pw; if (!u || !w || busy) return; tried.current = u + '\n' + w; setBusy(true); setErr(''); const e = await login(u, w); if (e) setErr(e); setBusy(false) }
  /** Isian otomatis (bukan ketikan/tempel) pada password -> langsung masuk, sekali per pasangan isian. */
  const onPw = (e: React.ChangeEvent<HTMLInputElement>) => { setPw(e.target.value); const t = (e.nativeEvent as InputEvent).inputType; if ((!t || t === 'insertReplacementText') && e.target.value && (idRef.current?.value ?? '') && tried.current !== (idRef.current!.value + '\n' + e.target.value)) setTimeout(submit, 200) }
  const th = useTheme(); const light = th === 'light'
  return <div className="min-h-screen login-bg flex flex-col items-center justify-center p-6 relative">
    <button type="button" aria-label={light ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'} onClick={() => setTheme(light ? 'dark' : 'light')} className="theme-btn login-theme">{light ? <Moon size={16} /> : <Sun size={16} />}<span className="text-[12px]">{light ? 'Gelap' : 'Terang'}</span></button>
    <div className="logo-plate login-logo login-corner"><img src={import.meta.env.BASE_URL + 'logo-dark.png'} alt="PLN Batubara Niaga" className="logo-full lg-d" /><img src={import.meta.env.BASE_URL + 'logo-light.png'} alt="PLN Batubara Niaga" className="logo-full lg-l" /></div>
    <div className="w-full max-w-xl login-card">
      <div className="text-center mb-6"><h1 className="text-3xl font-bold leading-tight num">Dashboard Operasi<br />PLN Batubara Niaga</h1><p className="text-sm text-slate-400 mt-3">Monitoring Pasokan PLTU, Realisasi, dan Shipment Terintegrasi</p></div>
      <h2 className="text-lg font-bold mb-1">Masuk</h2><p className="text-xs text-slate-400 mb-5">Gunakan User ID dan password yang terdaftar.</p>
      <form aria-label="Masuk" method="post" action="#" className="grid gap-3" onSubmit={e => { e.preventDefault(); submit() }}>
        <label className="text-xs">User ID<input ref={idRef} className="w-full mt-1" id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={id} onChange={e => setId(e.target.value)} /></label>
        <label className="text-xs">Password<input ref={pwRef} className="w-full mt-1" id="password" name="password" type="password" autoComplete="current-password" enterKeyHint="go" value={pw} onChange={onPw} /></label>
        {err && <p role="alert" className="text-xs text-amber-300">{err}</p>}
        <Btn type="submit" disabled={busy} className="!py-2">{busy ? 'Memeriksa…' : 'Masuk'}</Btn></form>
      <p className="text-[11px] text-slate-500 mt-4">Gerbang ini membatasi tampilan dashboard; data pada sheet sumber tetap mengikuti pengaturan berbagi Google Sheets.</p>
      <Link className="text-[11px] text-[#e6b457] underline" to="/buat-hash">Buat Hash Password</Link></div>
    <p className="text-[11px] text-slate-500 mt-6">Akses internal Direktorat Operasi.</p></div>
}
