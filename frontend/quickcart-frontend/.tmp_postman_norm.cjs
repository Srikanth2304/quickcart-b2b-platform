const fs=require('fs');
const eps=JSON.parse(fs.readFileSync('postman_domain_summary.json','utf8'));
function norm(raw){
  if(!raw) return '';
  let s=raw.trim();
  s=s.replace('{{baseUrl}}','');
  s=s.replace(/^https?:\/\/[^/]+/,'');
  const q=s.indexOf('?'); if(q>=0) s=s.slice(0,q);
  if(!s.startsWith('/')) s='/'+s;
  s=s.replace(/\/+/g,'/');
  s=s.replace(/\{\{([^}]+)\}\}/g,'{$1}');
  return s;
}
function normalizePath(ep){
  let p=ep.endpoint||'';
  if(!p || p==='/' || p==='') p=norm(ep.rawUrl||'');
  else p=norm(p);
  return p;
}
const mapped=eps.map(e=>({
  domain:e.domain,
  folder:e.folder,
  name:e.name,
  method:e.method,
  endpoint:normalizePath(e),
  query:e.query,
  requestBodyShape:e.requestBodyShape,
  responseShape:e.responseShape
}));
fs.writeFileSync('postman_normalized_endpoints.json',JSON.stringify(mapped,null,2));
const uniq={};
for(const e of mapped){ const k=e.method+' '+e.endpoint; if(!uniq[k]) uniq[k]=e; }
const uniqArr=Object.values(uniq);
fs.writeFileSync('postman_normalized_unique.json',JSON.stringify(uniqArr,null,2));
console.log('All records',mapped.length,'Unique method+endpoint',uniqArr.length);
console.log(uniqArr.slice(0,25).map(e=>e.method+' '+e.endpoint+' :: '+e.name).join('\n'));
