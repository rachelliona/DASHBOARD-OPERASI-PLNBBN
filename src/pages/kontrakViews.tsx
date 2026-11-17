import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { ClusterTag, Ring, SideBySide, shortMT } from '../components/kontrakViz'
import { KItem, KView } from '../components/KontrakModal'
import { banding, CLUSTER_VAR, Metric, partsOf, STATUS_LABEL } from '../domain/kontrak'
import { fmtNum, fmtPct } from '../domain/format'
import { kontrakActions } from '../kontrakStore'
import { MONTHS3 } from './useBanding'
type B = ReturnType<typeof banding>
type C = B['kontrak'][number]
const pctOf = (r: number, k: number) => k > 0 ? r / k * 100 : null
const Months = ({ data, color, title }: { data: number[]; color: string; title: string }) => { const mx = Math.max(...data, 1); return <section className="km-sec"><div className="km-bar"><h4>{title}</h4></div>
  <div className="km-months" role="img" aria-label={title}>{data.map((v, i) => <div key={i} title={`${MONTHS3[i]}: ${fmtNum(v)} MT`}><i style={{ height: `${v / mx * 100}%`, background: color, opacity: v > 0 ? 1 : .15 }} /><span>{MONTHS3[i]}</span><em>{v > 0 ? shortMT(v) : ''}</em></div>)}</div></section> }

export function makeViews(b: B, m: Metric, scope: string) {
  const mk = m === 'ds' ? 'Unloading (D/S)' : 'Loading (B/L)', mkS = m === 'ds' ? 'D/S' : 'B/L'
  const sum = (a: C[], f: (c: C) => number) => a.reduce((s, c) => s + f(c), 0)
  const cItem = (c: C): KItem => ({ key: c.id, name: c.pelanggan, sub: c.tambang.replace(/^(PT|CV) /, ''), tag: <ClusterTag c={c.cluster} />, color: CLUSTER_VAR[c.cluster], kontrak: c.vol, real: c.real[m], open: () => contractView(c) })
  const stats = (cs: C[]) => { const k = sum(cs, c => c.vol), r = sum(cs, c => c.real[m]), s = k - r; return [{ l: 'Volume kontrak', v: shortMT(k) + ' MT' }, { l: `Realisasi ${mkS}`, v: shortMT(r) + ' MT', c: '#34d399' }, { l: 'Pemenuhan', v: fmtPct(pctOf(r, k)) }, { l: s >= 0 ? 'Belum terealisasi' : 'Melebihi kontrak', v: shortMT(Math.abs(s)) + ' MT', c: s < 0 ? '#fbbf24' : '#a78bfa' }] }

  function contractView(c: C): KView {
    const real = c.real[m], pct = pctOf(real, c.vol), sisa = c.vol - real, over = sisa < 0
    const pem = b.pemasok.find(p => p.key === partsOf(c.tambang)[0])
    const sameP = b.kontrak.filter(x => x.id !== c.id && x.pelanggan === c.pelanggan), sameT = b.kontrak.filter(x => x.id !== c.id && x.tambang === c.tambang)
    const d: { k: 'ok' | 'warn' | 'info'; t: string }[] = []
    if (c.status === 1) d.push({ k: 'info', t: 'Status kontrak masih On Progress Kontrak Baru, jadi realisasi yang belum ada atau masih rendah adalah hal wajar.' })
    if (real <= 0) {
      if (!pem) d.push({ k: 'warn', t: 'Nama pemasok pada kontrak ini belum bisa dicocokkan ke shipment mana pun. Periksa penamaan di sheet, atau petakan lewat “Realisasi tanpa kontrak” di halaman Kontrak vs Realisasi.' })
      else if (pem.n === 0) d.push({ k: 'warn', t: `Belum ada shipment dari ${pem.nama} pada ${scope}. Bisa jadi memang belum ada pasokan, atau kolom sumber tambang dan mitra pada sheet belum terisi.` })
      else d.push({ k: 'warn', t: `${pem.nama} punya ${fmtNum(pem.n)} shipment (${shortMT(pem.real[m])} MT) pada ${scope}, tetapi seluruhnya terserap kontrak lain atau berada di luar kontrak PLTU ini.` })
      if (c.payung) d.push({ k: 'info', t: 'Kontrak payung hanya menerima sisa shipment pemasok yang tidak tertampung kontrak khusus PLTU.' })
    } else if (over) d.push({ k: 'warn', t: `Realisasi sudah melebihi volume kontrak ${shortMT(-sisa)} MT. Periksa apakah ada kontrak lanjutan atau addendum yang belum tercatat.` })
    else if ((pct ?? 0) >= 90) d.push({ k: 'ok', t: 'Pemenuhan sudah mendekati volume kontrak.' })
    if (c.payung && real > 0) d.push({ k: 'info', t: 'Kontrak payung: realisasi adalah estimasi alokasi shipment pemasok ke PLTU tanpa kontrak khusus, dibagi menurut volume kontrak.' })
    const bln = m === 'ds' ? c.real.bln : c.real.blnBl
    return { title: c.pelanggan, sub: `${c.tambang} · Kontrak No ${c.no}`, color: CLUSTER_VAR[c.cluster], mk: mkS,
      body: nav => <>
        <section className="km-hero">
          <Ring pct={pct} color={over ? '#fbbf24' : CLUSTER_VAR[c.cluster]} size={124} label={<b className="km-ring">{pct == null ? '—' : fmtPct(pct)}<small>pemenuhan</small></b>} />
          <div className="km-hero-r">
            <div className="km-big"><div><span>Volume kontrak</span><b>{fmtNum(c.vol)} <small>MT</small></b></div><div><span>Realisasi {mkS}</span><b style={{ color: '#34d399' }}>{fmtNum(real)} <small>MT</small></b></div><div><span>{over ? 'Melebihi' : 'Belum terealisasi'}</span><b style={{ color: over ? '#fbbf24' : '#a78bfa' }}>{fmtNum(Math.abs(sisa))} <small>MT</small></b></div></div>
            <SideBySide mk={mkS} items={[{ key: 'x', name: '', kontrak: c.vol, real, color: CLUSTER_VAR[c.cluster] }]} compact />
          </div></section>
        <section className="km-info">
          <div><span>Pemasok</span><b>{c.tambang}</b></div><div><span>GAR · cluster</span><b>{fmtNum(c.gar)} <ClusterTag c={c.cluster} /></b></div>
          <div><span>Status</span><b style={{ color: c.status ? '#fbbf24' : '#34d399' }}>● {STATUS_LABEL[c.status]}</b></div>
          <div><span>Jenis kontrak</span><b>{c.payung ? 'Payung (lintas PLTU)' : `Khusus ${c.pelanggan}`}</b></div>
          <div><span>Shipment teralokasi</span><b>{fmtNum(Math.round(c.real.n))}</b></div><div><span>Cakupan data</span><b>{scope}</b></div></section>
        {d.length > 0 && <section className="km-sec"><div className="km-bar"><h4>Analisis</h4></div><ul className="km-diag">{d.map((x, i) => <li key={i} className={x.k}>{x.k === 'warn' ? <AlertTriangle size={15} /> : x.k === 'ok' ? <CheckCircle2 size={15} /> : <Info size={15} />}<span>{x.t}</span></li>)}</ul></section>}
        {bln.some(x => x > 0) && <Months data={bln} color={CLUSTER_VAR[c.cluster]} title={`${mk} per bulan (MT, estimasi alokasi)`} />}
        {sameP.length > 0 && <section className="km-sec"><div className="km-bar"><h4>Kontrak lain {c.pelanggan} <em>{sameP.length}</em></h4><button type="button" className="km-link" onClick={() => nav.go(pltuView(c.pelanggan))}>Lihat semua ›</button></div>
          <div className="km-chips">{sameP.map(x => <button type="button" key={x.id} onClick={() => nav.go(contractView(x))}><ClusterTag c={x.cluster} /><span>{x.tambang.replace(/^(PT|CV) /, '')}</span><b>{shortMT(x.vol)}</b></button>)}</div></section>}
        {sameT.length > 0 && <section className="km-sec"><div className="km-bar"><h4>Kontrak lain pemasok ini <em>{sameT.length}</em></h4>{pem && <button type="button" className="km-link" onClick={() => nav.go(pemasokView(pem))}>Lihat pemasok ›</button>}</div>
          <div className="km-chips">{sameT.map(x => <button type="button" key={x.id} onClick={() => nav.go(contractView(x))}><ClusterTag c={x.cluster} /><span>{x.pelanggan}</span><b>{shortMT(x.vol)}</b></button>)}</div></section>}
      </> }
  }
  function pltuView(nama: string): KView {
    const cs = b.kontrak.filter(c => c.pelanggan === nama), pay = cs.some(c => c.payung)
    return { title: nama, sub: `${cs.length} kontrak · ${scope}`, color: '#34d399', stats: stats(cs), mk: mkS, itemsTitle: 'Kontrak', items: cs.map(cItem), note: pay ? 'Kontrak payung berlaku lintas PLTU: realisasinya adalah estimasi alokasi.' : undefined }
  }
  function pemasokView(p: B['pemasok'][number]): KView {
    const cs = b.kontrak.filter(c => partsOf(c.tambang)[0] === p.key), bln = m === 'ds' ? p.real.bln : p.real.blnBl
    return { title: p.nama, sub: `${cs.length} kontrak · ${fmtNum(p.n)} shipment · ${scope}`, color: '#38bdf8', mk: mkS,
      stats: [{ l: 'Volume kontrak', v: shortMT(p.kontrak) + ' MT' }, { l: `Realisasi ${mkS} (total)`, v: shortMT(p.real[m]) + ' MT', c: '#34d399' }, { l: 'Pemenuhan', v: fmtPct(pctOf(p.real[m], p.kontrak)) }, { l: 'Di luar kontrak PLTU', v: shortMT(p.luar[m]) + ' MT', c: p.luar[m] > 0 ? '#fbbf24' : undefined }],
      body: () => bln.some(x => x > 0) ? <Months data={bln} color="#38bdf8" title={`${mk} per bulan (MT)`} /> : null, itemsTitle: 'Kontrak', items: cs.map(cItem) }
  }
  function contracts(title: string, cs: C[], o: { sub?: string; sort?: string; note?: string; color?: string; empty?: string } = {}): KView {
    return { title, sub: o.sub ?? `${cs.length} kontrak · ${scope}`, color: o.color ?? '#e6b457', stats: stats(cs), note: o.note, sort: o.sort, mk: mkS, itemsTitle: 'Kontrak', items: cs.map(cItem), empty: o.empty }
  }
  function pltuList(o: { title?: string; sort?: string; cs?: C[] } = {}): KView {
    const g = new Map<string, C[]>(); (o.cs ?? b.kontrak).forEach(c => g.set(c.pelanggan, [...(g.get(c.pelanggan) ?? []), c]))
    const items: KItem[] = [...g].map(([n, cs]) => ({ key: n, name: n, sub: `${cs.length} kontrak${cs.some(c => c.payung) ? ' · payung (estimasi)' : ''}`, color: cs.some(c => c.payung) ? '#a78bfa' : '#34d399', kontrak: sum(cs, c => c.vol), real: sum(cs, c => c.real[m]), open: () => pltuView(n) }))
    return { title: o.title ?? 'Per PLTU / pelanggan', sub: `${items.length} PLTU / pelanggan · ${scope}`, color: '#34d399', stats: stats(o.cs ?? b.kontrak), sort: o.sort, mk: mkS, itemsTitle: 'PLTU / pelanggan', items }
  }
  function pemasokList(o: { title?: string; sort?: string; only?: (p: B['pemasok'][number]) => boolean } = {}): KView {
    const ps = b.pemasok.filter(o.only ?? (() => true))
    return { title: o.title ?? 'Per sumber tambang', sub: `${ps.length} pemasok · ${scope}`, color: '#38bdf8', sort: o.sort, mk: mkS,
      stats: [{ l: 'Volume kontrak', v: shortMT(b.total.kontrak) + ' MT' }, { l: `Realisasi ${mkS} (semua)`, v: shortMT(b.total.real[m]) + ' MT', c: '#34d399' }, { l: 'Teralokasi ke kontrak', v: shortMT(b.total.alokasi[m]) + ' MT' }, { l: 'Pemasok belum terisi di sheet', v: shortMT(b.tanpaNama[m]) + ' MT', c: '#94a3b8' }],
      itemsTitle: 'Pemasok', items: ps.map(p => ({ key: p.key, name: p.nama, sub: `${fmtNum(p.n)} shipment${p.luar[m] > 0 ? ` · ${shortMT(p.luar[m])} di luar kontrak PLTU` : ''}`, color: '#38bdf8', kontrak: p.kontrak, real: p.real[m], open: () => pemasokView(p) })) }
  }
  function tanpaKontrak(): KView {
    const xs = b.tanpaKontrak.filter(x => x.real[m] > 0), tot = xs.reduce((a, x) => a + x.real[m], 0)
    return { title: 'Realisasi tanpa kontrak', sub: `${xs.length} pemasok · ${scope}`, color: '#fb7185', stats: [{ l: `Realisasi ${mkS}`, v: shortMT(tot) + ' MT', c: '#fb7185' }, { l: 'Pemasok', v: String(xs.length) }, { l: 'Shipment', v: fmtNum(Math.round(xs.reduce((a, x) => a + x.real.n, 0))) }],
      note: 'Pemasok pada shipment yang tidak ditemukan di daftar kontrak. Bila hanya beda penamaan, buka pemasoknya lalu petakan ke nama di kontrak.', itemsTitle: 'Pemasok tanpa kontrak',
      items: xs.map(x => ({ key: x.label, name: x.label, sub: `${fmtNum(Math.round(x.real.n))} shipment`, color: '#fb7185', num: x.real[m], open: () => tkView(x) })) }
  }
  function tkView(x: B['tanpaKontrak'][number]): KView {
    const bln = m === 'ds' ? x.real.bln : x.real.blnBl
    return { title: x.label, sub: `Tidak ada di portofolio kontrak · ${scope}`, color: '#fb7185', stats: [{ l: `Realisasi ${mkS}`, v: fmtNum(x.real[m]) + ' MT', c: '#fb7185' }, { l: 'Shipment', v: fmtNum(Math.round(x.real.n)) }],
      body: () => <>
        {bln.some(v => v > 0) && <Months data={bln} color="#fb7185" title={`${mk} per bulan (MT)`} />}
        <section className="km-sec"><div className="km-bar"><h4>Petakan ke pemasok di kontrak</h4></div>
          <p className="km-note">Kalau “{x.label}” sebenarnya pemasok yang sama dengan salah satu kontrak, pilih di bawah. Pilih “-” untuk mengabaikan. Pemetaan tersimpan di browser ini dan angka diperbarui setelah popup ditutup.</p>
          <select aria-label={`Petakan ${x.label}`} defaultValue="" onChange={e => kontrakActions.setAlias(x.label, e.target.value)}><option value="">Belum dipetakan</option><option value="-">- (abaikan)</option>{b.pemasok.map(p => <option key={p.key} value={p.nama}>{p.nama}</option>)}</select></section></> }
  }
  return { contractView, pltuView, pemasokView, contracts, pltuList, pemasokList, tanpaKontrak }
}
