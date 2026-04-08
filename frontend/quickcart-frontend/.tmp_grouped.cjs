const fs=require('fs');
const arr=JSON.parse(fs.readFileSync('postman_unique_endpoints.json','utf8'));
const domains=['Auth APIs','Product APIs','Category APIs','Brand APIs','Cart APIs','Order APIs','Shipment APIs','Return APIs','Refund APIs','Payment APIs','Address APIs','Admin APIs'];
const group={}; domains.forEach(d=>group[d]=[]);
for(const e of arr){ const d=domains.includes(e.domain)?e.domain:'Admin APIs'; group[d].push(e); }
let out='';
for(const d of domains){ out+=`## ${d} (${group[d].length})\n`; group[d].sort((a,b)=>(a.endpoint+a.method).localeCompare(b.endpoint+b.method)).forEach(e=>{ out+=`- ${e.method} ${e.endpoint} | query: ${e.query.map(q=>q.key).join(',')||'-'} | req: ${e.requestBodyShape.slice(0,8).join(',')||'-'} | resp: ${e.responseShape.slice(0,8).join(',')||'-'}\n`;}); out+='\n'; }
fs.writeFileSync('postman_domain_grouped_unique.md',out);
console.log('written postman_domain_grouped_unique.md');
