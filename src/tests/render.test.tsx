// @vitest-environment jsdom
import { it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { StoreProvider } from '../store'
for (const p of ['/', '/laporan', '/peta', '/shipment', '/pltu', '/realisasi', '/mitra', '/si', '/sumber-data', '/pengaturan'])
  it('render ' + p, () => { const h = renderToString(<MemoryRouter initialEntries={[p]}><StoreProvider><App /></StoreProvider></MemoryRouter>); expect(h).toContain('Dashboard Operasi PLN Batubara Niaga') })
