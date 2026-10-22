// @vitest-environment jsdom
import { it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { StoreProvider } from '../store'
import { AuthProvider } from '../auth'
sessionStorage.setItem('pln-user', JSON.stringify({ id: 't', nama: 'Tes' }))
for (const p of ['/', '/laporan/harian', '/laporan/mingguan', '/peta', '/shipment', '/pltu', '/sheet/Januari', '/realisasi', '/realisasi/Oktober', '/realisasi/Foo', '/sheet/Realisasi%20PLTU', '/sumber-data', '/pengaturan'])
  it('render ' + p, () => { const h = renderToString(<MemoryRouter initialEntries={[p]}><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></MemoryRouter>); expect(h).toContain('Dashboard Operasi PLN Batubara Niaga') })

it('tanpa sesi: halaman masuk; /buat-hash terbuka', () => {
  sessionStorage.clear()
  const r = (p: string) => renderToString(<MemoryRouter initialEntries={[p]}><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></MemoryRouter>)
  expect(r('/peta')).toContain('Masuk'); expect(r('/peta')).not.toContain('Peta Shipment'); expect(r('/buat-hash')).toContain('Buat Hash Password')
})
