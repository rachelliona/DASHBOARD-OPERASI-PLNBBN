export const APPS_SCRIPT = `// Registri SI PLN BBN — Google Apps Script (Web App). Penomoran atomik dengan LockService.
const SHEET = 'SI', BLOK = 'BLOK';
function sh_(n){ const s=SpreadsheetApp.getActive(); let x=s.getSheetByName(n); if(!x){ x=s.insertSheet(n); x.appendRow(n==='SI'?['id','tahun','nomor','json']:['tahun','nomor','ket']); } return x; }
function rows_(){ const v=sh_(SHEET).getDataRange().getValues().slice(1); return v.filter(r=>r[0]).map(r=>JSON.parse(r[3])); }
function blok_(){ return sh_(BLOK).getDataRange().getValues().slice(1).filter(r=>r[1]).map(r=>({tahun:+r[0],nomor:+r[1],ket:r[2]})); }
function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e){ if((e.parameter.action||'list')==='list') return out_({ok:true,rows:rows_(),blok:blok_()}); return out_({ok:false,error:'aksi tidak dikenal'}); }
function put_(row){ const s=sh_(SHEET), v=s.getDataRange().getValues(); for(let i=1;i<v.length;i++){ if(v[i][0]===row.id){ s.getRange(i+1,1,1,4).setValues([[row.id,row.tahun,row.nomor||'',JSON.stringify(row)]]); return; } } s.appendRow([row.id,row.tahun,row.nomor||'',JSON.stringify(row)]); }
function maxNo_(tahun){ let m=0; rows_().forEach(r=>{ if(+r.tahun===tahun && r.nomor && r.tahap!=='pengajuan') m=Math.max(m,+r.nomor); }); blok_().forEach(b=>{ if(b.tahun===tahun) m=Math.max(m,b.nomor); }); return m; }
function pakai_(tahun,no,id){ return rows_().some(r=>+r.tahun===tahun && +r.nomor===no && r.id!==id && r.tahap!=='pengajuan') || blok_().some(b=>b.tahun===tahun && b.nomor===no); }
function doPost(e){
  const lock=LockService.getScriptLock(); lock.waitLock(20000);
  try{
    const b=JSON.parse(e.postData.contents), a=b.action;
    if(a==='reserve'){ const row=b.row; row.tahun=b.tahun; let no=b.nomor; if(no){ if(pakai_(b.tahun,+no,row.id)) return out_({ok:false,error:'Nomor '+no+'/'+b.tahun+' sudah dipakai'}); } else no=maxNo_(b.tahun)+1; row.nomor=+no; row.tahap='terbit'; put_(row); return out_({ok:true,row:row}); }
    if(a==='save'){ const row=b.row; if(row.nomor && pakai_(+row.tahun,+row.nomor,row.id)) return out_({ok:false,error:'Nomor dobel ditolak server'}); put_(row); return out_({ok:true,row:row}); }
    if(a==='block'){ if(pakai_(+b.tahun,+b.nomor,'')) return out_({ok:false,error:'Nomor sudah dipakai'}); sh_(BLOK).appendRow([b.tahun,b.nomor,b.ket||'']); return out_({ok:true}); }
    if(a==='unblock'){ const s=sh_(BLOK), v=s.getDataRange().getValues(); for(let i=v.length-1;i>=1;i--) if(+v[i][0]===+b.tahun && +v[i][1]===+b.nomor) s.deleteRow(i+1); return out_({ok:true}); }
    if(a==='delete'){ const s=sh_(SHEET), v=s.getDataRange().getValues(); for(let i=v.length-1;i>=1;i--) if(v[i][0]===b.id && (b.paksa || JSON.parse(v[i][3]).tahap==='pengajuan')) s.deleteRow(i+1); return out_({ok:true}); }
    if(a==='import'){ const s=sh_(SHEET), have={}; rows_().forEach(r=>have[r.id]=1); const add=(b.rows||[]).filter(r=>!have[r.id]).map(r=>[r.id,r.tahun,r.nomor||'',JSON.stringify(r)]); if(add.length) s.getRange(s.getLastRow()+1,1,add.length,4).setValues(add); (b.blok||[]).forEach(x=>{ if(!blok_().some(y=>y.tahun===x.tahun&&y.nomor===x.nomor)) sh_(BLOK).appendRow([x.tahun,x.nomor,x.ket||'']); }); return out_({ok:true,n:add.length}); }
    return out_({ok:false,error:'aksi tidak dikenal'});
  } finally { lock.releaseLock(); }
}`
