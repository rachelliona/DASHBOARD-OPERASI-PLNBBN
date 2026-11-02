import fs from 'node:fs'
import path from 'node:path'
import { parseCsv, Parsed } from '../src/domain/csv'
import { SOURCES } from '../src/config/sources'
import { buildSnapshot, sheetsNeeded } from '../src/domain/snapshot'
import { nowWib } from '../src/domain/format'
import { updateEtaHistory, EtaHist } from '../src/domain/eta'
const out = process.argv[2] ?? 'snapshots'
async function main() {
  const now = new Date(), tables: Record<string, Parsed> = {}
  for (const n of sheetsNeeded(now)) {
    const s = SOURCES.find(x => x.name === n)!
    for (let k = 1; ; k++) { try { const r = await fetch(s.url); if (!r.ok) throw new Error('HTTP ' + r.status); tables[n] = parseCsv(await r.text()); break } catch (e) { if (k >= 3) throw new Error(`Gagal mengambil sheet ${n}: ${e}`); await new Promise(r => setTimeout(r, 5000)) } }
  }
  const snap = buildSnapshot(n => tables[n], now, nowWib())
  for (const [n, m] of [['ALL Shipment', snap.all], [snap.bulan, snap.months[snap.bulan]]] as const) if (m.missing.length || !m.ships.length) throw new Error(`Snapshot ditolak: sheet ${n} tidak lengkap (kolom hilang: ${m.missing.join(', ') || '-'}, shipment: ${m.ships.length})`)
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, `${snap.date}.json`), JSON.stringify(snap))
  const ip = path.join(out, 'index.json'), dates = new Set<string>(fs.existsSync(ip) ? JSON.parse(fs.readFileSync(ip, 'utf8')).dates : [])
  dates.add(snap.date); fs.writeFileSync(ip, JSON.stringify({ dates: [...dates].sort() }))
  const hp = path.join(out, 'eta-history.json'); const hist: EtaHist = fs.existsSync(hp) ? JSON.parse(fs.readFileSync(hp, 'utf8')) : {}
  fs.writeFileSync(hp, JSON.stringify(updateEtaHistory(hist, Object.values(snap.months).flatMap(m => m.ships), snap.date)))
  console.log(`Snapshot ${snap.date}: ${snap.all.ships.length} shipment (ALL), bulan ${snap.bulan} ${snap.months[snap.bulan].ships.length} shipment`)
}
main().catch(e => { console.error(e); process.exit(1) })
