import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { SOURCES } from '../config/sources'
import { ytdFromGrid, csvGrid, YtdSheet } from '../domain/view'
/** Total tahun berjalan dari sheet DASHBOARD (Dashboard 1), diambil ulang tiap 60 detik (tidak aktif di mode snapshot). */
export function useSheetYtd(): YtdSheet | null {
  const { asOf } = useStore(); const [v, setV] = useState<YtdSheet | null>(null)
  useEffect(() => { if (asOf) { setV(null); return } const u = SOURCES.find(x => x.name === 'Dashboard 1')?.url; if (!u) return; let alive = true; const c = new AbortController()
    const load = () => fetch(u + (u.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store', signal: c.signal }).then(r => r.ok ? r.text() : Promise.reject()).then(t => { if (alive) setV(ytdFromGrid(csvGrid(t))) }).catch(() => { /* pertahankan angka terakhir */ }); load(); const t = setInterval(load, 60000); return () => { alive = false; clearInterval(t); c.abort() } }, [asOf])
  return v
}
