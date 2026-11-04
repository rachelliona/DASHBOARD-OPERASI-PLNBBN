/** Pengelompokan wilayah mengikuti laporan harian (PDF 21 Okt 2026). */
export const REGION_OF: Record<string, string[]> = {
  JAMALI: ['Tj. Jati B', 'Paiton', 'Suralaya', 'Tj. Awar Awar', 'Suralaya Baru', 'Rembang', 'Pelabuhan Ratu', 'Paiton Baru', 'Pacitan', 'Teluk Naga Unit IV', 'Teluk Naga', 'Labuan', 'Indramayu', 'Adipala'],
  Sumatra: ['Tembilahan', 'Teluk Sirih', 'Tarahan Baru', 'Tj. Balai Karimun', 'Riau Tenayan', 'Pangkalan Susu Unit 1-4', 'Pangkalan Susu', 'Ombilin', 'Nagan Raya', 'Labuhan Angin', 'Galang Batang', 'Bukit Asam', 'Belitung Baru', 'Bangka Baru'],
  Kalimantan: ['SW ITP', 'Malinau', 'Teluk Balikpapan', 'Tj. Redeb / Berau', 'Sintang', 'Sanggau', 'Pulang Pisau', 'Parit Baru / Bengkayang', 'Ketapang', 'Asam Asam'],
  'Sulmapana 1': ['Kendari 3', 'Kendari', 'Jayapura', 'Gorontalo', 'Endog Jeranjang', 'Ende', 'Sulsel Barru 2', 'Barru', 'Amurang SW', 'Amurang', 'Ampana'],
  'Sulmapana 2': ['Batam', 'Tidore Ternate', 'Timor', 'Takalar', 'Sulut 1', 'Sumbawa Barat', 'Sofifi', 'Palu 3', 'Lombok FTP 2', 'Kupang'],
  'PLTU IPP': ['Lestari Banten Energi', 'Cilacap', 'Meulaboh 3-4', 'Jeneponto', 'Kaltim-4', 'Embalut', 'Paiton Energy Company', 'Bengkulu', 'Celukan Bawang', 'Kalbar 1', 'LED', 'Jawa 7'],
}
export const REGION_COLOR: Record<string, string> = { JAMALI: '#fde047', Sumatra: '#2dd4bf', Kalimantan: '#f472b6', 'Sulmapana 1': '#a3e635', 'Sulmapana 2': '#d6b38a', 'PLTU IPP': '#e5e7eb' }
/** Palet wilayah sengaja berbeda keluarga warna dari palet tahapan (status.ts): wilayah = kuning-teal-pink-lime-pasir-perak; tahapan = merah-biru langit-oranye-indigo-ungu-hijau. Chip wilayah juga netral dengan titik warna agar tidak tertukar. */
