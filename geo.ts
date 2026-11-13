import LAND from '../../data/indo-land.json'
/** Garis pantai Indonesia (Natural Earth 50m, domain publik) yang sudah dipotong ke kotak peta; dibundel agar tidak perlu internet. */
export const land = LAND as unknown as number[][][]
const bb = land.map(p => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y) } return [a, b, c, d] })
export const inLand = (lon: number, lat: number) => {
  for (let i = 0; i < land.length; i++) { const [a, b, c, d] = bb[i]; if (lon < a || lon > b || lat < c || lat > d) continue
    const p = land[i]; let ins = false
    for (let j = 0, k = p.length - 1; j < p.length; k = j++) { const [xi, yi] = p[j], [xj, yj] = p[k]; if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ins = !ins }
    if (ins) return true }
  return false
}
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) / 4294967295 }
export const polysIn = (x0: number, x1: number, y0: number, y1: number) => land.filter((_, i) => { const [a, b, c, d] = bb[i]; return !(b < x0 || a > x1 || d < y0 || c > y1) })
/** Titik asal ilustratif kapal di laut (bukan posisi nyata): arah ditentukan dari id, dipilih yang jatuh di perairan. */
const originCache = new Map<string, [number, number]>()
export function seaOrigin(key: string, lon: number, lat: number): [number, number] {
  const hit = originCache.get(key + lon + lat); if (hit) return hit
  const a0 = hash(key) * Math.PI * 2; let out: [number, number] = [lon + 1.2 * Math.cos(a0), lat + 1.2 * Math.sin(a0)]
  outer: for (const R of [2.4, 1.8, 1.3, 3.2]) for (let k = 0; k < 12; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5; const ox = lon + R * Math.cos(a), oy = lat + R * Math.sin(a)
    if (!inLand(ox, oy) && !inLand((ox + lon) / 2, (oy + lat) / 2) && !inLand(lon + (ox - lon) * 0.25, lat + (oy - lat) * 0.25)) { out = [ox, oy]; break outer } }
  originCache.set(key + lon + lat, out); return out
}
