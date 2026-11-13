import fs from 'node:fs'
import path from 'node:path'
import { stepDays } from '../src/domain/monthly'
import { etaDelay } from '../src/domain/eta'
import { analisis, stepStats, evidence, AI_SYSTEM, parseAiJson } from '../src/domain/sebab'
/** Analisis AI keterlambatan. Dijalankan di GitHub Actions setelah snapshot. Tanpa ANTHROPIC_API_KEY: dilewati. Kunci TIDAK pernah masuk ke frontend. */
const dir = process.argv[2] ?? 'snapshots', key = process.env.ANTHROPIC_API_KEY
const MAKS = +(process.env.ANALISIS_MAKS ?? 45), BATCH = 15, MODEL = process.env.ANALISIS_MODEL ?? 'claude-sonnet-5-5'
async function main() {
  if (!key) { console.log('ANTHROPIC_API_KEY tidak diset — analisis AI dilewati.'); return }
  const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')).dates as string[]; const date = idx[idx.length - 1]
  const snap = JSON.parse(fs.readFileSync(path.join(dir, `${date}.json`), 'utf8')); const ref = Date.parse(date)
  const ships: any[] = snap.all.ships; const stats = stepStats(ships, stepDays)
  const cp = path.join(dir, 'analisis.json'); const cache: Record<string, any> = fs.existsSync(cp) ? JSON.parse(fs.readFileSync(cp, 'utf8')) : {}
  const todo = ships.filter(s => s.si && s.eta != null).map(s => ({ s, e: etaDelay(s, 6, ref) })).filter(x => (x.e.kind === 'aktual' || x.e.kind === 'lewat-eta') && (x.e.days ?? 0) > 0)
    .filter(x => cache[x.s.id]?.delay !== x.e.days).sort((a, b) => (b.e.days ?? 0) - (a.e.days ?? 0)).slice(0, MAKS)
  console.log(`${todo.length} shipment terlambat perlu dianalisis`)
  for (let i = 0; i < todo.length; i += BATCH) {
    const part = todo.slice(i, i + BATCH).map(({ s, e }) => { const d = stepDays(s.ms); return evidence(s, e.days!, analisis(s.ms, d, stats, s.note ?? '', ref, e.days), d, stats) })
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: AI_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(part) }] }) })
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
      const txt = ((await r.json()) as any).content?.map((c: any) => c.text ?? '').join('') ?? ''; const ok = new Set(part.map(p => p.id))
      for (const h of parseAiJson(txt)) if (ok.has(h.id)) cache[h.id] = { d: date, delay: todo.find(x => x.s.id === h.id)!.e.days, t: h.t, k: h.k }
    } catch (e) { console.error('Batch gagal:', String(e)) }
  }
  fs.writeFileSync(cp, JSON.stringify(cache)); console.log(`analisis.json: ${Object.keys(cache).length} entri`)
}
main().catch(e => { console.error(e); process.exit(0) })
