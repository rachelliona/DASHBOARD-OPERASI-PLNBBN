/** Pengelompokan wilayah mengikuti laporan harian (PDF 21 Okt 2026). */
export const REGION_OF: Record<string, string[]> = {
  JAMALI: ['Tj. Jati B', 'Paiton', 'Suralaya', 'Tj. Awar Awar', 'Suralaya Baru', 'Rembang', 'Pelabuhan Ratu', 'Paiton Baru', 'Pacitan', 'Teluk Naga Unit IV', 'Teluk Naga', 'Labuan', 'Indramayu', 'Adipala'],
  Sumatra: ['Sebalang', 'Tembilahan', 'Teluk Sirih', 'Tarahan Baru', 'Tj. Balai Karimun', 'Riau Tenayan', 'Pangkalan Susu Unit 1-4', 'Pangkalan Susu', 'Ombilin', 'Nagan Raya', 'Labuhan Angin', 'Galang Batang', 'Bukit Asam', 'Belitung Baru', 'Bangka Baru'],
  Kalimantan: ['SW ITP', 'Malinau', 'Teluk Balikpapan', 'Tj. Redeb / Berau', 'Sintang', 'Sanggau', 'Pulang Pisau', 'Parit Baru / Bengkayang', 'Ketapang', 'Asam Asam'],
  'Sulmapana 1': ['Sorong', 'Mamuju', 'Kendari 3', 'Kendari', 'Jayapura', 'Gorontalo', 'Endog Jeranjang', 'Ende', 'Sulsel Barru 2', 'Barru', 'Amurang SW', 'Amurang', 'Ampana'],
  'Sulmapana 2': ['Batam', 'Tidore Ternate', 'Timor', 'Takalar', 'Sulut 1', 'Sumbawa Barat', 'Sofifi', 'Palu 3', 'Lombok FTP 2', 'Kupang'],
  Lainnya: ['CBF', 'Morowali - PT Cahaya Smelter Indonesia', 'Morowali - PT Lestari Smelter Indonesia', 'Morowali - PT Hengjaya Nickle Industry', 'Morowali - PT Bukit Smelter Indonesia', 'Morowali - PT Oracle Nickle Industry', 'PT Huadi Nickel - Alloy Indonesia', 'PT Indonesia Tsingshan Stainless Steel', 'PT Yong Wang Indonesia', 'Gresik - Maspion', 'PT Merak Energi', 'PT Minertama Prima Abadi', 'PT Duta Reka Bumi', 'PT Obsidian Stainless Steel', 'Jetty Lamongan Shorebase', 'PT Pabrik Kertas Indonesia', 'PT Indorama Petrochemicals', 'Jetty Antam Pomalaa'],
  'PLTU IPP': ['Lestari Banten Energi', 'Cilacap', 'Meulaboh 3-4', 'Jeneponto', 'Kaltim-4', 'Embalut', 'Paiton Energy Company', 'Bengkulu', 'Celukan Bawang', 'Kalbar 1', 'LED', 'Jawa 7'],
}
export const REGION_COLOR: Record<string, string> = { JAMALI: '#fde047', Sumatra: '#2dd4bf', Kalimantan: '#f472b6', 'Sulmapana 1': '#a3e635', 'Sulmapana 2': '#d6b38a', 'PLTU IPP': '#e5e7eb', Lainnya: '#c4b5fd' }
/** Palet wilayah sengaja berbeda keluarga warna dari palet tahapan (status.ts): wilayah = kuning-teal-pink-lime-pasir-perak; tahapan = merah-biru langit-oranye-indigo-ungu-hijau. Chip wilayah juga netral dengan titik warna agar tidak tertukar. */
