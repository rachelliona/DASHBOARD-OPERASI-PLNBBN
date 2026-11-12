export type NavItem = { label: string; to?: string; soon?: boolean; children?: NavItem[]; icon?: string }
const sheet = (name: string, label = name): NavItem => ({ label, to: '/sheet/' + encodeURIComponent(name) })
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const NAV: NavItem[] = [
  { label: 'Ringkasan', to: '/', icon: 'dash' },
  { label: 'Peta Shipment', to: '/peta', icon: 'map' },
  { label: 'Laporan Harian', to: '/laporan/harian', icon: 'file' },
  { label: 'Monitoring', icon: 'activity', children: [
    { label: 'Analisis', to: '/analisis' }, { label: 'Gantt Pasokan', to: '/gantt' }, { label: 'Simulasi ETA Shipment', to: '/simulasi' }, { label: 'Dashboard Interaktif', to: '/dashboard' }, { label: 'Shipment', to: '/shipment' }, { label: 'ETA Rakor & Keterlambatan', to: '/eta' }, { label: 'Linimasa Tahap', to: '/linimasa' }, { label: 'Pasokan PLTU', to: '/pltu' },
    { label: 'Realisasi', children: [{ label: 'Ringkasan Realisasi', to: '/realisasi' }, { label: 'Per Bulan', children: BULAN.map(b => ({ label: b, to: '/realisasi/' + b })) },
      sheet('Realisasi PLTU'), sheet('Realisasi Mitra Tambang'), sheet('Realisasi Mitra Transport'),
      { label: 'Rekap (data mentah)', children: [sheet('Per PLTU Rekap'), sheet('Per IPP Rekap'), sheet('Data running (SUM)'), sheet('Data running (QTY)')] }] },
    { label: 'SI', children: [sheet('ALL Shipment'), sheet('Nomor SI'), sheet('Realisasi Penugasan Mitra'), sheet('Pengalihan Shipment')] }] },
  { label: 'Mitra dan Kepatuhan', icon: 'users', children: [sheet('List Izin Mitra'), sheet('Jetty'), sheet('Standar Rejection')] },
  { label: 'Data', icon: 'db', children: [{ label: 'Sumber Data dan Kualitas Data', to: '/sumber-data' }, { label: 'Pengaturan', to: '/pengaturan' },
    { label: 'Sheet Bulanan (mentah)', children: BULAN.map(b => sheet(b)) }, sheet('Dashboard 1'), sheet('Data Sheet'), sheet('Pivot Table 2'), sheet('MINI DAHSBOARD'), sheet('Sheet13')] },
]

/** Menu Data (sumber data, pengaturan, sheet mentah) hanya untuk akun admin; pengguna lain berhenti di "Mitra dan Kepatuhan". */
export const ADMIN_IDS = ['racel']
export const isAdmin = (u?: { id: string } | null) => !!u && ADMIN_IDS.includes(u.id.trim().toLowerCase())
export const DATA_SHEETS = new Set(['Dashboard 1', 'Data Sheet', 'Pivot Table 2', 'MINI DAHSBOARD', 'Sheet13', ...BULAN])
export const navFor = (admin: boolean) => admin ? NAV : NAV.filter(n => n.label !== 'Data')
