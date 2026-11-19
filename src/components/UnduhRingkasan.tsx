import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { useStore } from '../store'
import { useKontrak } from '../kontrakStore'
import { banding } from '../domain/kontrak'
import { BULAN, regionOf } from '../domain/monthly'
import { REGIONS, STATUSES } from '../domain/status'
import { sum, kebutuhan, plantActual } from '../domain/kpi'
import { fmtNum, fmtDate, nowWib } from '../domain/format'
import type { RingkasanData } from '../report/ringkasanPdf'

/** Tombol unduh ringkasan operasi (PDF) dari data yang sedang tampil di dashboard. */
export default function UnduhRingkasan({ className = 'rhead-y' }: { className?: string }) {
  const { kinds, bulanAktif, months, threshold, asOf } = useStore(); const kon = useKontrak(); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const go = async () => {
    const plants = kinds.plant?.rows as any[] | undefined, ships = kinds.shipment?.rows as any[] | undefined; if (!plants || !ships) return
    setBusy(true); setErr('')
    try {
      const { buildRingkasanPdf } = await import('../report/ringkasanPdf')
      const target = sum(plants, 'target'), co = sum(plants, 'carryOver'), bl = sum(plants, 'bl'), ds = sum(plants, 'ds')
      const tahap = STATUSES.filter(s => s.key !== 'carryOver').map(s => { const x = ships.filter(h => h.status === s.key); return { key: s.key, label: s.label, n: x.length, vol: sum(x, 'volume') } })
      const sp = (months[bulanAktif] && !months[bulanAktif].missing?.length ? months[bulanAktif].ships : []) as any[]; const isIpp = (s: any) => regionOf(s.plant) === 'PLTU IPP'
      const bk = (xs: any[], kf: string) => { const f = xs.filter(s => s.konf === kf); return { konf: f.reduce((a, s) => a + (s.jumlah ?? 0), 0), real: f.reduce((a, s) => a + (s.bl ?? 0), 0) } }
      const rincian = [{ label: 'PLN Group', ...bk(sp.filter(s => !isIpp(s)), 'bulan') }, { label: 'IPP', ...bk(sp.filter(isIpp), 'bulan') }, { label: 'Carry over', ...bk(sp, 'carry') }]
      const wilayah = REGIONS.map(r => { const x = plants.filter(p => p.wilayah === r); return { nama: r, target: sum(x, 'target'), co: sum(x, 'carryOver'), bl: sum(x, 'bl'), ds: sum(x, 'ds'), n: sum(x, 'n') } })
      const dgKeb = plants.filter(p => kebutuhan(p) > 0), dibawah = dgKeb.filter(p => plantActual(p) / kebutuhan(p) * 100 < threshold)
      const perhatian = [...dibawah].sort((a, b) => (kebutuhan(b) - plantActual(b)) - (kebutuhan(a) - plantActual(a))).slice(0, 10).map(p => ({ pltu: p.pltu, wilayah: p.wilayah ?? '—', keb: kebutuhan(p), ds: plantActual(p), jalan: (p.loading ?? 0) + (p.sailing ?? 0) + (p.tiba ?? 0) + (p.bongkar ?? 0) }))
      const loaded = BULAN.filter(b => months[b] && !months[b].missing?.length)
      let kontrak: RingkasanData['kontrak'] = null
      if (loaded.length && kon.rows.length) {
        const idx = new Map<any, number>(); const all = loaded.flatMap(b => (months[b].ships as any[]).map(s => { idx.set(s, BULAN.indexOf(b)); return s })); const B = banding(kon.rows, all, kon.alias, s => idx.get(s) ?? null)
        kontrak = { bulanTermuat: loaded.length, volume: B.total.kontrak, realisasi: B.kontrak.reduce((a, k) => a + k.real.ds, 0), jumlah: B.kontrak.length, tanpaRealisasi: B.kontrak.filter(k => k.real.ds <= 0).length, tanpaKontrakMT: B.tanpaKontrak.reduce((a, x) => a + x.real.ds, 0), tanpaKontrakN: B.tanpaKontrak.length, pemasok: B.pemasok.filter(p => p.kontrak > 0).slice(0, 8).map(p => ({ nama: p.nama, kontrak: p.kontrak, real: p.real.ds })) }
      }
      const noDs = ships.filter(h => h.status === 'unloading' && !(h.ds > 0)); const noStatus = (months[bulanAktif]?.skipped ?? 0)
      const catatan = [
        asOf ? `Angka berasal dari salinan data tanggal ${fmtDate(asOf)} (bukan data langsung).` : 'Angka berasal dari Google Sheets monitoring pasokan pada saat file ini dibuat.',
        'Pemenuhan = Complete Unloading (D/S) dibagi kebutuhan (konfirmasi + carry over). Volume shipment yang belum selesai bongkar memakai angka B/L.',
        ...(noDs.length ? [`${noDs.length} shipment berstatus Selesai Bongkar belum memiliki angka D/S di sheet (${fmtNum(sum(noDs, 'volume'))} MT dihitung memakai B/L pada tabel tahapan). Angka ini belum masuk Complete Unloading.`] : []),
        ...(noStatus ? [`${fmtNum(noStatus)} baris kosong pada sheet dilewati saat perhitungan.`] : []),
        ...(kontrak ? ['Realisasi per kontrak adalah hasil pembagian shipment ke kontrak pemasok yang sama, sehingga bersifat estimasi untuk kontrak payung.'] : ['Bagian kontrak tidak disertakan karena data bulanan belum termuat.']),
      ]
      const at = String(kinds.plant?.at ?? '').replace(' pukul ', ', ')
      const blob = await buildRingkasanPdf({ bulan: bulanAktif, posisi: at || '—', dibuat: 'Dibuat dari dashboard pada ' + nowWib(), sumber: '', target, co, bl, ds, tahap, rincian, wilayah, perhatian, ambang: threshold, jumlahPltu: dgKeb.length, jumlahDiBawahAmbang: dibawah.length, kontrak, catatan })
      const d = new Date(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Ringkasan Operasi_${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } catch (e: any) { setErr('Gagal membuat PDF: ' + (e?.message ?? e)) } finally { setBusy(false) }
  }
  return <><button type="button" className={className} disabled={busy} onClick={go} title="Unduh ringkasan poin penting dalam bentuk PDF"><FileDown size={15} />{busy ? 'Membuat PDF…' : 'Unduh ringkasan (PDF)'}</button>{err && <span role="alert" className="text-[11px] text-rose-300">{err}</span>}</>
}
