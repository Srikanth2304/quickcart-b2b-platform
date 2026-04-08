const fs=require('fs');
let raw=fs.readFileSync('src/b2bRetail.postman_collection.json','utf8').replace(/^\uFEFF/,'');
const j=JSON.parse(raw);
const endpoints=[];
const domainMap = [
  ['auth','Auth APIs'],['product','Product APIs'],['products','Product APIs'],['category','Category APIs'],['categories','Category APIs'],
  ['brand','Brand APIs'],['brands','Brand APIs'],['cart','Cart APIs'],['order','Order APIs'],['orders','Order APIs'],
  ['shipment','Shipment APIs'],['shipments','Shipment APIs'],['return','Return APIs'],['returns','Return APIs'],
  ['refund','Refund APIs'],['payment','Payment APIs'],['payments','Payment APIs'],['address','Address APIs'],['addresses','Address APIs'],
  ['admin','Admin APIs']
];
function detectDomain(path, folder){
  const p=(path||'').toLowerCase();
  const f=(folder||'').toLowerCase();
  for(const [k,d] of domainMap){ if(p.includes('/'+k) || f.includes(k)) return d; }
  return 'Admin APIs';
}
function collectKeys(obj,prefix='',out=new Set()){
  if(obj===null||obj===undefined) return out;
  if(Array.isArray(obj)){ if(obj.length) collectKeys(obj[0],prefix?prefix+'[]':'[]',out); else out.add(prefix?prefix+'[]':'[]'); return out; }
  if(typeof obj==='object'){
    Object.keys(obj).forEach(k=>{ const np=prefix?prefix+'.'+k:k; out.add(np); collectKeys(obj[k],np,out);});
    return out;
  }
  if(prefix) out.add(prefix);
  return out;
}
function walk(items, folders=[]){
  (items||[]).forEach(it=>{
    if(it.item) return walk(it.item,[...folders,it.name]);
    if(!it.request) return;
    const u=it.request.url||{};
    const path=Array.isArray(u.path)?('/'+u.path.join('/')):'';
    const method=it.request.method||'';
    const query=Array.isArray(u.query)?u.query.map(q=>({key:q.key||'',value:q.value||''})):[];
    let requestBodyShape=[];
    const body=it.request.body||{};
    if(body.raw){
      try{ const obj=JSON.parse(body.raw); requestBodyShape=[...collectKeys(obj)]; }
      catch{ requestBodyShape=['<non-json-or-template-body>']; }
    }
    let responseShape=[];
    const firstResp=(it.response||[]).find(r=>r.body)||null;
    if(firstResp && firstResp.body){
      try{ const ro=JSON.parse(firstResp.body); responseShape=[...collectKeys(ro)]; }
      catch{ responseShape=['<non-json-or-template-body>']; }
    }
    endpoints.push({
      domain:detectDomain(path,folders.join(' > ')), folder:folders.join(' > '), name:it.name||'', method,
      endpoint:path||u.raw||'', rawUrl:u.raw||'', query, requestBodyShape, responseShape
    });
  });
}
walk(j.item||[]);
fs.writeFileSync('postman_domain_summary.json',JSON.stringify(endpoints,null,2));
const counts={};
for(const e of endpoints){counts[e.domain]=(counts[e.domain]||0)+1;}
console.log('Total endpoints',endpoints.length);
console.log(counts);
