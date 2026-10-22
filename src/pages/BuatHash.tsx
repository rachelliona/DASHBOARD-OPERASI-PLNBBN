import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn, Card } from '../components/ui'
import { hashPassword } from '../domain/auth'
export default function BuatHash() {
  const [t, setT] = useState(''); const [out, setOut] = useState(''); const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); const lines: string[] = []
    for (const l of t.split('\n').map(x => x.trim()).filter(Boolean)) { const i = l.indexOf(','); if (i < 1) { lines.push(`${l}\t(format salah: gunakan userid,password)`); continue } const id = l.slice(0, i).trim(), pw = l.slice(i + 1); lines.push(`${id}\t${await hashPassword(id, pw)}`) }
    setOut(lines.join('\n')); setBusy(false) }
  return <div className="max-w-xl mx-auto p-4"><Card title="Buat Hash Password">
    <p className="text-xs text-slate-400 mb-2">Satu baris per akun, format <code>userid,password</code>. Proses dilakukan di peramban kamu; password tidak dikirim ke mana pun. Salin kolom hash ke kolom Password pada tabel login (jangan simpan password asli di sheet). Pakai password panjang dan acak (minimal 12 karakter), karena tabel login bisa dibaca siapa pun yang memiliki tautannya.</p>
    <textarea className="w-full h-28 text-xs" aria-label="Daftar akun" value={t} onChange={e => setT(e.target.value)} placeholder={'racel,kata-sandi-panjang-acak'} />
    <div className="my-2"><Btn disabled={busy || !t.trim()} onClick={run}>{busy ? 'Memproses…' : 'Buat Hash'}</Btn></div>
    {out && <textarea readOnly className="w-full h-28 text-xs mono" aria-label="Hasil hash" value={out} />}
    <Link className="text-xs text-sky-400 underline" to="/">Kembali ke halaman masuk</Link></Card></div>
}
