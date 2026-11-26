import { OdsView, OdsCfg } from './OdsTransport'
import { BB_DOC_URL, BB_ES_URL, BB_PROSES, BB_SHEET_LINK, mitraEs2026, parseBbDocs, rekapBb } from '../domain/odsBatubara'

const rpF = (n?: number) => n ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '—'
const BATUBARA: OdsCfg = {
  judul: 'ODS Batubara', sub: <>Outstanding hutang batubara ke mitra sumber tambang 2026 · sumber: sheet Executive Summary Hutang Batubara &amp; Hutang Batubara 2026 · hanya mitra yang masih punya hutang yang ditampilkan</>,
  kunci: ['ODSBB-ES', 'ODSBB-DOC'], url: [BB_ES_URL, BB_DOC_URL], link: BB_SHEET_LINK, parseDocs: parseBbDocs, parseEs: (es, docs) => rekapBb(docs, mitraEs2026(es)),
  n2L: 'Belum kontrak / belum tagih (N1–N2)', n2S: 'N1–2', n3L: 'Proses verifikasi (N3)', n3S: 'N3', proses: BB_PROSES,
  alur: 'Alur: N1 belum ada kontrak → N2 belum tagih → N3 verifikasi BBN → N4 siap bayar → lunas.', mitraJudul: 'Hutang per mitra sumber tambang',
  sumberNote: 'Nilai = kolom HARGA di sheet Hutang Batubara 2026 (sama dengan Executive Summary).', nilaiLabel: 'Harga',
  kolom: [{ h: 'Sumber tambang', v: x => x.tambang || x.mitra }, { h: 'Ship ke', a: 'r', v: x => x.shipKe || '—' }, { h: 'Nama kapal', v: x => x.kapal.slice(0, 42) || '—' }, { h: 'Volume (MT)', a: 'r', v: x => x.volume ? x.volume.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '—' }, { h: 'Tujuan', v: x => x.tujuan || '—' }],
  kolomNilai: [{ h: 'DPP', a: 'r', v: x => rpF(x.dpp) }, { h: 'PPN', a: 'r', v: x => rpF(x.ppn) }, { h: 'PPh 22', a: 'r', v: x => rpF(x.pph) }, { h: 'Realisasi', a: 'r', v: x => rpF(x.realisasi) }],
}
export default function OdsBatubara() { return <OdsView cfg={BATUBARA} /> }
