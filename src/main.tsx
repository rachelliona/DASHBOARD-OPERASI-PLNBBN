import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import { DetailProvider } from './components/Detail'
import { AuthProvider } from './auth'
import '@fontsource-variable/inter'
import './index.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><AuthProvider><StoreProvider><DetailProvider><App /></DetailProvider></StoreProvider></AuthProvider></HashRouter></React.StrictMode>)
if ('serviceWorker' in navigator && import.meta.env.PROD && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', () => {
  const had = !!navigator.serviceWorker.controller; let reloaded = false
  /* versi baru aktif -> muat ulang sekali agar HP tidak nyangkut di versi lama */
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || reloaded) return; reloaded = true; location.reload() })
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const cek = () => { reg.update().catch(() => { /* offline */ }) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cek() })
    window.addEventListener('pln-refresh', cek)
  }).catch(() => { /* tanpa offline cache: aplikasi tetap jalan */ })
})
