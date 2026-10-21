const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTNubBR6mjW_E_aD78ZK64jqZw-in5h9qa_6fbgCh2hOgzTl1PjFMeVO_2jij8SsDHUDOVcQngIZ5SB/pub'
export const buildUrl = (gid: string) => `${BASE}?gid=${gid}&single=true&output=csv`
const G: [string, string][] = [['Dashboard 1','942073348'],['ALL Shipment','444499332'],['Januari','921714454'],['Februari','2039095069'],['Maret','132450331'],['April','1950398894'],['Mei','1225909002'],['Juni','1270520099'],['Juli','1492008871'],['Agustus','881505671'],['September','908348136'],['Oktober','501649616'],['November','2141780051'],['Desember','187543668'],['Realisasi PLTU','1426672881'],['Realisasi Mitra Tambang','1946141745'],['Sheet13','1688409017'],['Realisasi Mitra Transport','813416334'],['Nomor SI','275104604'],['Data running (SUM)','1989326288'],['Data running (QTY)','169377745'],['Data Sheet','1550076636'],['Per PLTU Rekap','1325637596'],['Per IPP Rekap','2113579453'],['Pivot Table 2','2101354252'],['MINI DAHSBOARD','1843780426'],['List Izin Mitra','29636161'],['Jetty','1794403537'],['Standar Rejection','649412833'],['Realisasi Penugasan Mitra','1510652837'],['Pengalihan Shipment','1694312757']]
export const SOURCES = G.map(([name, gid]) => ({ name, gid, url: buildUrl(gid) }))
export const GROUPS = {
  realisasi: ['Realisasi PLTU','Realisasi Mitra Tambang','Realisasi Mitra Transport','Per PLTU Rekap','Per IPP Rekap','Data running (SUM)','Data running (QTY)','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
  mitra: ['List Izin Mitra','Jetty','Standar Rejection','Realisasi Mitra Tambang','Realisasi Mitra Transport'],
  si: ['Nomor SI','Realisasi Penugasan Mitra','Pengalihan Shipment','ALL Shipment'],
}
