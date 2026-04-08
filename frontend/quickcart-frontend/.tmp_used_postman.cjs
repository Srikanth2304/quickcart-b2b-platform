const fs=require('fs');
const post=JSON.parse(fs.readFileSync('postman_unique_endpoints.json','utf8'));
const cross=JSON.parse(fs.readFileSync('api_crosscheck_report.json','utf8'));
function norm(p){ return (p||'').replace(/\{\{[^}]+\}\}/g,'{var}').replace(/\$\{[^}]+\}/g,'{var}'); }
function patt(p){ return new RegExp('^'+norm(p).replace(/\{var\}/g,'[^/]+')+'$'); }
const usedUnique={};
for(const u of cross.used){
 const fm=u.frontend;
 const match=post.find(pe=>pe.method===fm.method && patt(pe.endpoint).test(norm(fm.endpoint)));
 if(match){ const k=match.method+' '+match.endpoint; usedUnique[k]=match; }
}
const arr=Object.values(usedUnique);
fs.writeFileSync('used_postman_endpoints.json',JSON.stringify(arr,null,2));
console.log('Used unique mapped endpoints',arr.length);
arr.forEach(e=>console.log(e.method,e.endpoint,'::',e.name));
