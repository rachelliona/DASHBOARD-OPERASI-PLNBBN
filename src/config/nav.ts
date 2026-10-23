export type NavItem = { label: string; to?: string; soon?: boolean; children?: NavItem[] }
const sheet = (name: string, label = name): NavItem => ({ label, to: '/sheet/' + encodeURIComponent(name) })
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const NAV: NavItem[] = [
  { label: 'Ringkasan', to: '/' },
  { label: 'Peta Shipment', to: '/peta' },
  { label: 'Laporan Harian', to: '/laporan/harian' },
  { label: 'Monitoring', children: [
    { label: 'Dashboard Interaktif', to: '/dashboard' }, { label: 'Shipment', to: '/shipment' }, { label: 'Pasokan PLTU', to: '/pltu' },
    { label: 'Realisasi', children: [{ label: 'Ringkasan Realisasi', to: '/realisasi' }, { label: 'Per Bulan', children: BULAN.map(b => ({ label: b, to: '/realisasi/' + b })) },
      sheet('Realisasi PLTU'), sheet('Realisasi Mitra Tambang'), sheet('Realisasi Mitra Transport'),
      { label: 'Rekap (data mentah)', children: [sheet('Per PLTU Rekap'), sheet('Per IPP Rekap'), sheet('Data running (SUM)'), sheet('Data running (QTY)')] }] },
    { label: 'SI', children: [sheet('ALL Shipment'), sheet('Nomor SI'), sheet('Realisasi Penugasan Mitra'), sheet('Pengalihan Shipment')] }] },
  { label: 'Mitra dan Kepatuhan', children: [sheet('List Izin Mitra'), sheet('Jetty'), sheet('Standar Rejection')] },
  { label: 'Data', children: [{ label: 'Sumber Data dan Kualitas Data', to: '/sumber-data' }, { label: 'Pengaturan', to: '/pengaturan' },
    { label: 'Sheet Bulanan (mentah)', children: BULAN.map(b => sheet(b)) }, sheet('Dashboard 1'), sheet('Data Sheet'), sheet('Pivot Table 2'), sheet('MINI DAHSBOARD'), sheet('Sheet13')] },
]
