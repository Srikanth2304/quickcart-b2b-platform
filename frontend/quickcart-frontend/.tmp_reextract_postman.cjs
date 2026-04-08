const fs=require('fs');
const raw=fs.readFileSync('src/b2bRetail.postman_collection.json','utf8').replace(/^\uFEFF/,'');
const j=JSON.parse(raw);
const domainMap=[['auth','Auth APIs'],['product','Product APIs'],['products','Product APIs'],['category','Category APIs'],['categories','Category APIs'],['brand','Brand APIs'],['brands','Brand APIs'],['cart','Cart APIs'],['order','Order APIs'],['orders','Order APIs'],['shipment','Shipment APIs'],['shipments','Shipment APIs'],['return','Return APIs'],['returns','Return APIs'],['refund','Refund APIs'],['payment','Payment APIs'],['payments','Payment APIs'],['address','Address APIs'],['addresses','Address APIs'],['admin','Admin APIs']];
function detectDomain(path,folder){ const p=(path||'').toLowerCase(); const f=(folder||'').toLowerCase(); for(const [k,d] of domainMap){ if(p.includes('/'+k)||f.includes(k)) return d; } return 'Admin APIs'; }
function norm(url){ let s=(url||'').trim(); s=s.replace('{{baseUrl}}',''); s=s.replace(/^https?:\/\/[^/]+/,''); if(!s.startsWith('/')) s='/'+s; s=s.replace(/\/+/g,'/'); return s; }
function splitQuery(path){ const i=path.indexOf('?'); if(i<0) return {path, query:[]}; const p=path.slice(0,i); const q=path.slice(i+1).split('&').filter(Boolean).map(kv=>{ const [k,v='']=kv.split('='); return {key:k,value:v};}); return {path:p,query:q}; }
function collectKeys(obj,prefix='',out=new Set()){ if(obj===null||obj===undefined) return out; if(Array.isArray(obj)){ if(obj.length) collectKeys(obj[0],prefix?prefix+'[]':'[]',out); else out.add(prefix?prefix+'[]':'[]'); return out;} if(typeof obj==='object'){ for(const k of Object.keys(obj)){ const np=prefix?prefix+'.'+k:k; out.add(np); collectKeys(obj[k],np,out);} return out;} if(prefix) out.add(prefix); return out; }
const out=[];
function walk(items,folders=[]){
 for(const it of (items||[])){
  if(it.item){ walk(it.item,[...folders,it.name]); continue; }
  if(!it.request) continue;
  const method=it.request.method||'';
  const u=it.request.url;
  let rawUrl=''; let path=''; let query=[];
  if(typeof u==='string'){ rawUrl=u; const sq=splitQuery(norm(u)); path=sq.path; query=sq.query; }
  else if(u && typeof u==='object'){ rawUrl=u.raw||''; if(Array.isArray(u.path)&&u.path.length){ path='/' + u.path.join('/'); } else if(rawUrl){ path=splitQuery(norm(rawUrl)).path; } if(Array.isArray(u.query)){ query=u.query.map(q=>({key:q.key||'',value:q.value||''})); } else if(rawUrl && query.length===0){ query=splitQuery(norm(rawUrl)).query; } }
  const body=it.request.body||{};
  let requestBodyShape=[];
  if(body.raw){ try{ requestBodyShape=[...collectKeys(JSON.parse(body.raw))]; }catch{ requestBodyShape=['<non-json-or-template-body>']; } }
  let responseShape=[];
  const firstResp=(it.response||[]).find(r=>r.body);
  if(firstResp&&firstResp.body){ try{ responseShape=[...collectKeys(JSON.parse(firstResp.body))]; }catch{ responseShape=['<non-json-or-template-body>']; } }
  out.push({domain:detectDomain(path,folders.join(' > ')),folder:folders.join(' > '),name:it.name||'',method,endpoint:path,rawUrl:rawUrl,query,requestBodyShape,responseShape});
 }
}
walk(j.item||[]);
fs.writeFileSync('postman_domain_summary.json',JSON.stringify(out,null,2));
const uniq={}; for(const e of out){ const k=e.method+' '+e.endpoint; if(!uniq[k]) uniq[k]=e; }
const uniqArr=Object.values(uniq); fs.writeFileSync('postman_unique_endpoints.json',JSON.stringify(uniqArr,null,2));
console.log('records',out.length,'unique',uniqArr.length);
console.log(uniqArr.slice(0,30).map(e=>`${e.method} ${e.endpoint}`).join('\n'));
