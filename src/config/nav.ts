export type NavItem = { label: string; to?: string; soon?: boolean; children?: NavItem[]; icon?: string }
const sheet = (name: string, label = name): NavItem => ({ label, to: '/sheet/' + encodeURIComponent(name) })
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const NAV: NavItem[] = [
  { label: 'Ringkasan', to: '/', icon: 'dash' },
  { label: 'Peta Shipment', to: '/peta', icon: 'map' },
  { label: 'Laporan Harian', to: '/laporan/harian', icon: 'report' },
  { label: 'Shipping Instruction', to: '/si', icon: 'ship' },
  { label: 'Kualitas', icon: 'lab', children: [{ label: 'Home Kualitas', to: '/kualitas/home' }, { label: 'All Shipment', to: '/kualitas/shipment' }, { label: 'Umpire and Rejection', to: '/kualitas/umpire' }, { label: 'Evaluasi Mitra (PDF)', to: '/kualitas/evaluasi' }] },
  { label: 'Monitoring', icon: 'activity', children: [
    { label: 'Analisis', to: '/analisis' }, { label: 'Gantt Pasokan', to: '/gantt' }, { label: 'Simulasi ETA Shipment', to: '/simulasi' }, { label: 'Dashboard Interaktif', to: '/dashboard' }, { label: 'Shipment', to: '/shipment' }, { label: 'ETA Rakor & Keterlambatan', to: '/eta' }, { label: 'Linimasa Tahap', to: '/linimasa' }, { label: 'Pasokan PLTU', to: '/pltu' },
    { label: 'Realisasi', children: [{ label: 'Ringkasan Realisasi', to: '/realisasi' }, { label: 'Per Bulan', children: BULAN.map(b => ({ label: b, to: '/realisasi/' + b })) },
      sheet('Realisasi PLTU'), sheet('Realisasi Mitra Tambang'), sheet('Realisasi Mitra Transport'),
      { label: 'Rekap (data mentah)', children: [sheet('Per PLTU Rekap'), sheet('Per IPP Rekap'), sheet('Data running (SUM)'), sheet('Data running (QTY)')] }] },
    { label: 'SI', children: [{ label: 'Dashboard SI', to: '/si/dashboard' }, { label: 'Rekap SI', to: '/si/rekap' }, { label: 'Plot SI', to: '/si/plot' }, { label: 'Peta SI', to: '/si/peta' }, sheet('ALL Shipment'), sheet('Nomor SI'), sheet('Realisasi Penugasan Mitra'), sheet('Pengalihan Shipment')] }] },
  { label: 'Kontrak', icon: 'contract', children: [{ label: 'Portofolio Kontrak', to: '/kontrak' }, { label: 'Kontrak vs Realisasi', to: '/kontrak/banding' }, { label: 'Data Kontrak', to: '/kontrak/data' }] },
  { label: 'Mitra dan Kepatuhan', icon: 'users', children: [{ label: 'Kinerja Mitra', to: '/kinerja-mitra' }, sheet('List Izin Mitra'), sheet('Jetty'), sheet('Standar Rejection')] },
  { label: 'Data', icon: 'db', children: [{ label: 'Sumber Data dan Kualitas Data', to: '/sumber-data' }, { label: 'Pengaturan', to: '/pengaturan' },
    { label: 'Sheet Bulanan (mentah)', children: BULAN.map(b => sheet(b)) }, sheet('Dashboard 1'), sheet('Data Sheet'), sheet('Pivot Table 2'), sheet('MINI DAHSBOARD'), sheet('Sheet13')] },
]

/** Menu Data (sumber data, pengaturan, sheet mentah) hanya untuk akun admin; pengguna lain berhenti di "Mitra dan Kepatuhan". */
export const ADMIN_IDS = ['racel']
/** Yang boleh membuat SI (terbit, revisi, koreksi). Dicocokkan dengan User ID atau nama depan akun. */
export const SI_PEMBUAT = ['racel', 'popi', 'billy', 'andi', 'rendi', 'rully', 'catur', 'pras']
export const bisaBuatSI = (u?: { id: string; nama?: string } | null) => !!u && ((u.id ?? '') + ' ' + (u.nama ?? '')).toLowerCase().split(/[^a-z]+/).some(t => SI_PEMBUAT.includes(t))
export const bisaKoreksiBesar = (u?: { id: string; nama?: string } | null) => !!u && ((u.id ?? '') + ' ' + (u.nama ?? '')).toLowerCase().split(/[^a-z]+/).some(t => ['racel', 'andi', 'billy'].includes(t))
export const isAdmin = (u?: { id: string } | null) => !!u && ADMIN_IDS.includes(u.id.trim().toLowerCase())
export const DATA_SHEETS = new Set(['Dashboard 1', 'Data Sheet', 'Pivot Table 2', 'MINI DAHSBOARD', 'Sheet13', ...BULAN])
export const navFor = (admin: boolean) => admin ? NAV : NAV.filter(n => n.label !== 'Data')
