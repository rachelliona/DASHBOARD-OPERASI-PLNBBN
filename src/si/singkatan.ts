/** Singkatan nama sumber tambang untuk nama file SI. Yang tidak ada di daftar ini otomatis memakai inisial tiap kata (tanpa PT/CV). Tambah/ubah di sini. */
export const SINGKATAN: Record<string, string> = {
  'borneo indobara': 'BIB', 'barasentosa lestari': 'BSL', 'baramulti suksessarana': 'BSSR', 'kaltim prima coal': 'KPC', 'antang gunung meratus': 'AGM',
  'kideco jaya agung': 'KIDECO', 'arutmin indonesia': 'ARUTMIN', 'jhonlin group': 'JHONLIN', 'mifa bersaudara': 'MIFA', 'tiwa abadi': 'TIWA',
}
const kata = (n: string) => n.replace(/^(konsorsium\s+)?(pt|cv)\.?\s+/i, '').replace(/[.,]+$/g, '').replace(/\s*&.*$/, '').trim()
export function singkat(nama: string): string {
  const k = kata(nama || ''); if (!k) return ''
  const m = SINGKATAN[k.toLowerCase()]; if (m) return m
  const w = k.split(/\s+/).filter(Boolean); return w.length === 1 ? w[0].toUpperCase() : w.map(x => x[0]).join('').toUpperCase()
}
export function ringkasPltu(p: string): string {
  const t = (p || '').split(/[.,(\n]/)[0].replace(/^PLTU\s+/i, '').replace(/\bTanjung\b/gi, 'Tj').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, ' '); return t ? 'PLTU ' + t : 'PLTU'
}
