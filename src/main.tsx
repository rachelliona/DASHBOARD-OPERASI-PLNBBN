import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import { DetailProvider } from './components/Detail'
import { AuthProvider } from './auth'
import './index.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><AuthProvider><StoreProvider><DetailProvider><App /></DetailProvider></StoreProvider></AuthProvider></HashRouter></React.StrictMode>)
if ('serviceWorker' in navigator && import.meta.env.PROD && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* tanpa offline cache: aplikasi tetap jalan */ }) })
