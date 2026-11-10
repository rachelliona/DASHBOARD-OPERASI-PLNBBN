// @vitest-environment jsdom
import { it, expect, beforeAll } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { StoreProvider } from '../store'
import { AuthProvider } from '../auth'
import { buildSnapshot } from '../domain/snapshot'
import { parseCsv } from '../domain/csv'
const csv = `MONITORING PASOKAN,,,,,,,,,,
PLTU,Wilayah,Konfirmasi,Tgl.,Jumlah,TB/BG,Status,No. SI,Tgl. SI,Mitra Real.,Moda,Sumber Tambang,TA POL,Berthing,"Commence
Loading","Complete
Loading","Sailing
Time",B/L,D/S,TA PLTU,Berthing,"Commence
Unloading","Complete
Unloading"
Adipala (PC) LRC,,Oktober,13,30.000,MV X,Selesai Muat/Sailing,2572,12/10,BIB,Vessel,PT Borneo Indobara,11/10/26 19:42,17/10/26 14:00,17/10/26 14:30,20/10/26 03:00,20/10/26 04:00,"27.000,000",,,,,
Adipala (PC) LRC,,Carry Over,,30.000,MV Y,Selesai Bongkar,2180,07/09,BIB,Vessel,PT Borneo Indobara,21/09/26 06:48,,23/09/26 19:50,27/09/26 23:00,28/09/26 11:24,"33.000,000","33.000,026",02/10/26 00:00,02/10/26 01:25,02/10/26 02:45,05/10/26 00:05
Paiton (PJB),,Oktober,25,7.500,TB A/BG B;x,Tiba/Antri,2600,,AGM,300 ft,PT Antang,,,,,,"7.500,100",,,,,
Kupang (CFB),,Oktober,Nov,7.500,TB C,Sudah Ada Jadwal Muat,2700,,JG,300 ft,PT JG,,,,,,,,,,,
Subtotal,,,,150.000,,,,,,,,,,,,,"120.000,000","60.000,069",,,,
`
beforeAll(() => { (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; const snap = buildSnapshot(() => parseCsv(csv), new Date('2026-10-27T10:00:00Z'), '27 Oktober 2026 pukul 17.00 WIB'); (globalThis as any).fetch = async (u: string) => u.endsWith('/index.json') ? { ok: true, json: async () => ({ dates: ['2026-10-27'] }) } : u.endsWith('2026-10-27.json') ? { ok: true, json: async () => snap } : { ok: true, text: async () => csv }; sessionStorage.setItem('pln-user', JSON.stringify({ id: 't', nama: 'Tes' })) })
const cases: [string, string][] = [['/', 'Ringkasan Pasokan'], ['/laporan/harian', 'Unduh PDF'], ['/peta', 'Panel Detail'], ['/dashboard', 'Dashboard Interaktif'], ['/shipment', 'Daftar Shipment'], ['/pltu', 'klik kartu untuk detail dan shipment terkait'], ['/realisasi/Oktober', 'Realisasi Oktober'], ['/realisasi', 'Ringkasan Realisasi 2026'], ['/linimasa', 'Linimasa & Keterlambatan Shipment'], ['/eta', 'ETA Rakor & Keterlambatan']]
for (const [path, text] of cases) it('berisi data: ' + path, async () => {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el)
  await act(async () => { root.render(<MemoryRouter initialEntries={[path]}><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></MemoryRouter>) })
  await act(async () => { await new Promise(r => setTimeout(r, 150)) })
  expect(el.textContent).toContain(text); expect(el.textContent).not.toContain('Memuat Data…')
  await act(async () => { root.unmount() })
})

it('peta: tampilan rekap tahun berjalan', async () => {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el)
  await act(async () => { root.render(<MemoryRouter initialEntries={['/peta']}><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></MemoryRouter>) })
  await act(async () => { await new Promise(r => setTimeout(r, 100)) })
  const btn = [...el.querySelectorAll('button')].find(b => b.textContent === 'Rekap Tahun Berjalan')!; expect(btn).toBeTruthy()
  await act(async () => { btn.click() }); await act(async () => { await new Promise(r => setTimeout(r, 150)) })
  expect(el.textContent).toContain('Rekap Tahun Berjalan'); expect(el.textContent).not.toContain('Memuat Data…')
  await act(async () => { root.unmount() })
})

it('pilih tanggal: tampilan memakai snapshot', async () => {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el)
  await act(async () => { root.render(<MemoryRouter initialEntries={['/']}><AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider></MemoryRouter>) })
  await act(async () => { await new Promise(r => setTimeout(r, 120)) })
  const sel = el.querySelector('select[aria-label="Tanggal data"]') as HTMLSelectElement; expect([...sel.options].map(o => o.value)).toContain('2026-10-27')
  await act(async () => { sel.value = '2026-10-27'; sel.dispatchEvent(new Event('change', { bubbles: true })) }); await act(async () => { await new Promise(r => setTimeout(r, 150)) })
  expect(el.textContent).toContain('Data per 27 Oktober 2026'); expect(el.textContent).toContain('Ringkasan Pasokan'); expect(el.textContent).not.toContain('Langsung ·')
  await act(async () => { root.unmount() })
})
