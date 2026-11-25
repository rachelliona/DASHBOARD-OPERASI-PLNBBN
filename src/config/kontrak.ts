/** Seed portofolio kontrak batubara (dari Coal Contract Command Center). Urutan: No, pelanggan, pemasok/tambang, GAR, cluster, volume (MT), status (0 = terkontrak, 1 = on progress kontrak baru). */
export type Cluster = 'LRC' | 'MRC' | 'HRC'
export type Kontrak = { id: string; no: string; pelanggan: string; tambang: string; gar: number; cluster: Cluster; vol: number; status: 0 | 1
  /** kolom tambahan dari sheet Database Kontrak (opsional) */
  pelangganLengkap?: string; trader?: string; nomor?: string; mulai?: string; akhir?: string; jenis?: string; skema?: string; harga?: number | null; ket?: string }
export const KONTRAK_SEED: [number | string, string, string, number, Cluster, number, 0 | 1][] = [
  [4, "PLN/PNP", "PT Artha Tunggal Mandiri", 3700, "LRC", 687000, 0],
  [5, "PLN Group", "PT Menambang Muara Enim", 4200, "LRC", 52500, 0],
  [6, "PLN Group", "PT Menambang Muara Enim", 4600, "MRC", 30000, 0],
  [17, "PIP", "PT Manoor Bulatn Lestari", 5200, "HRC", 70000, 0],
  [18, "PIP", "PT Manoor Bulatn Lestari", 5600, "HRC", 30000, 0],
  [1, "PLN (PLTU SWITP)", "PT Sebuku Sejaka Coal", 5500, "HRC", 105000, 0],
  [2, "PLN/PNP", "PT Cristian Eka Pratama", 3800, "LRC", 50000, 0],
  [3, "PLN/PNP", "PT Borneo Indobara", 4100, "LRC", 11608000, 0],
  [7, "PLTU LBE", "PT Batu Hitam Jaya & PT Seluma Prima Coal", 4000, "LRC", 226000, 0],
  [8, "PLTU LBE", "PT Sarwa Sembada Karya Bumi", 4100, "LRC", 226000, 0],
  [9, "PLTU LBE", "PT Berkah Kudungane Sibu Indonesia", 4200, "LRC", 226000, 0],
  [10, "PLTU LBE", "PT Energi Cita Harapan", 4200, "LRC", 226000, 0],
  [11, "PLTU LBE", "PT Gateham Komoditas Indonesia", 4100, "LRC", 226000, 0],
  [12, "PLTU LBE", "PT Bainra Bumi Sejahtera", 4600, "MRC", 400000, 0],
  [13, "PLTU Kaltim-4", "PT Baramulti Suksessarana, Tbk", 3800, "LRC", 250000, 0],
  [14, "PLTU Kaltim-4", "PT Bumi Alam Raya", 4200, "LRC", 400000, 0],
  [15, "PLN/PNP/PIP", "PT Tiwa Abadi", 3800, "LRC", 165000, 0],
  [16, "PLN", "PT Arutmin Indonesia", 3800, "LRC", 580000, 0],
  [19, "PIP", "PT Arutmin Indonesia", 3800, "LRC", 544500, 0],
  [20, "PNP", "PT Arutmin Indonesia", 3800, "LRC", 1075500, 0],
  [21, "PLTU Cilacap", "PT Antang Gunung Meratus", 3800, "LRC", 200000, 0],
  [22, "PLTU Cilacap", "PT Dutadharma Utama", 4600, "MRC", 30000, 0],
  [23, "PLTU Cilacap", "CV Mitra Mining", 4000, "LRC", 45000, 0],
  [24, "PLTU Cilacap", "PT Tambang Aneka Mineral", 3800, "LRC", 35000, 0],
  [25, "PLTU Cilacap", "PT Bainra Bumi Sejahtera", 4600, "MRC", 500000, 0],
  ["-", "PLTU Cilacap", "PT Bainra Bumi Sejahtera", 4600, "MRC", 350000, 0],
  [26, "PLN Batam", "PT Sarwa Sembada Karya Bumi", 4100, "LRC", 15000, 0],
  [27, "PLN Batam", "PT Adidaya Akbar Berkarya & CV Sarana Usaha", 4100, "LRC", 7500, 0],
  [28, "PLN Batam", "CV Mitra Mining", 4100, "LRC", 7500, 0],
  [29, "PLN Batam", "CV Mitra Mining", 4600, "MRC", 7500, 0],
  [30, "PLN Batam", "CV Mitra Mining", 4200, "LRC", 7500, 0],
  [31, "PLN Batam", "PT Batu Hitam Jaya", 4100, "LRC", 7500, 0],
  [32, "PLN Batam", "Blending", 4600, "MRC", 7500, 0],
  [32, "PLN Batam", "PT Tebo Prima", 4100, "LRC", 15000, 0],
  [33, "Paiton Energy", "PT Tujuh Bara Sejahtera", 4900, "MRC", 22500, 0],
  [34, "Paiton Energy", "PT Bainra Bumi Sejahtera", 4600, "MRC", 100000, 0],
  [35, "PLTU Kalbar-1", "PT Antang Gunung Meratus", 3800, "LRC", 40000, 0],
  [36, "PLTU Kalbar-1", "PT Arutmin Indonesia", 3800, "LRC", 400000, 0],
  [37, "PLTU Jawa-7", "PT Borneo Indobara", 4100, "LRC", 1050000, 0],
  [37, "PLTU Jawa-7", "KBS", 4500, "MRC", 480000, 1],
  [38, "PLTU Jawa-7", "KBS", 4600, "MRC", 77000, 1],
  [39, "PLTU Jawa-7", "PT Menambang Muara Enim", 4200, "LRC", 100000, 0],
  [40, "Paiton Energy", "Blending", 4600, "MRC", 100000, 0],
  [41, "PLTU Jawa-7", "PT Tiwa Abadi", 3800, "LRC", 23000, 0],
  [42, "PLN IP (Spot)", "Blending", 4600, "MRC", 1150000, 0],
  [42, "CBF Jawa 7", "Blending", 5200, "HRC", 150000, 0],
  [43, "PLTU Jeneponto", "Blending BBS ITM", 4600, "MRC", 150000, 0],
  [44, "PLTU Jeneponto", "Blending BBS ITM", 4600, "MRC", 351915, 1],
  [45, "PLTU Jeneponto", "PT Mandiri Inti Perkasa", 4500, "MRC", 50000, 0],
  [46, "PLTU Celukan Bawang", "PT Mandiri Inti Perkasa", 4500, "MRC", 150000, 0],
]

/** Pelanggan kontrak → nama PLTU di dashboard. Pelanggan yang tidak ada di sini dianggap kontrak payung (lintas PLTU). */
export const PLTU_KONTRAK: Record<string, string[]> = {
  'PLTU Cilacap': ['Cilacap'], 'PLTU Kaltim-4': ['Kaltim-4'], 'PLTU Kalbar-1': ['Kalbar 1'], 'PLTU Jawa-7': ['Jawa 7'], 'CBF Jawa 7': ['CBF'],
  'PLTU Jeneponto': ['Jeneponto'], 'PLTU Celukan Bawang': ['Celukan Bawang'], 'PLTU LBE': ['Lestari Banten Energi'], 'Paiton Energy': ['Paiton Energy Company'],
  'PLN Batam': ['Batam'], 'PLN (PLTU SWITP)': ['SW ITP'], 'PLTU Tanjung Jati-B': ['Tj. Jati B', 'Tanjung Jati B'], 'PLN IP (Spot)': [],
}

/** Kode Mitra Real. di sheet shipment → nama pemasok di kontrak. Dibuktikan dari silang kolom Sumber Tambang pada data shipment; bisa dikoreksi di halaman Data kontrak. */
export const KODE_PEMASOK: Record<string, string> = {
  BIB: 'Borneo Indobara', BAR: 'Bumi Alam Raya', BBS: 'Bainra Bumi Sejahtera', BSSR: 'Baramulti Suksessarana', ATM: 'Artha Tunggal Mandiri', TA: 'Tiwa Abadi',
  MME: 'Menambang Muara Enim', AGM: 'Antang Gunung Meratus', MIP: 'Mandiri Inti Perkasa', SBM: 'Manoor Bulatn Lestari', SSC: 'Sebuku Sejaka Coal',
  CEP: 'Cristian Eka Pratama', TBC: 'Tebo Prima', RAP: 'Sarwa Sembada Karya Bumi', JG: 'Arutmin Indonesia', CBF: 'Blending',
}
