const fs=require('fs');
const post=JSON.parse(fs.readFileSync('postman_unique_endpoints.json','utf8'));
const front=JSON.parse(fs.readFileSync('frontend_api_calls_extracted.json','utf8'));
function normPath(p){
  let s=(p||'').trim();
  s=s.replace('{{baseUrl}}','').replace(/^https?:\/\/[^/]+/,'');
  if(!s.startsWith('/')) s='/'+s;
  s=s.replace(/\/+/g,'/');
  s=s.replace(/\$\{[^}]+\}/g,'{var}');
  s=s.replace(/\{\{[^}]+\}\}/g,'{var}');
  return s;
}
function pattern(s){ return normPath(s).replace(/\{var\}/g,'[^/]+'); }
function exactToken(s){ return normPath(s).replace(/\{var\}/g,'{*}'); }
const postMapped=post.map(p=>({...p, norm:endpoint=normPath(p.endpoint), patt:new RegExp('^'+pattern(p.endpoint)+'$')}));
const frontMapped=front.map(f=>({...f,norm:normPath(f.endpoint)}));
const used=[]; const unmatchedFront=[];
for(const f of frontMapped){
  const m=postMapped.find(p=>p.method===f.method && p.patt.test(f.norm));
  if(m) used.push({frontend:f, postman:m}); else unmatchedFront.push(f);
}
const usedKeys=new Set(used.map(u=>u.postman.method+' '+u.postman.endpoint));
const unusedPost=postMapped.filter(p=>!usedKeys.has(p.method+' '+p.endpoint));
const out={postmanTotal:post.length,frontendCallTotal:front.length,matchedCalls:used.length,unmatchedFrontend:unmatchedFront.length,used,unusedPost,unmatchedFront};
fs.writeFileSync('api_crosscheck_report.json',JSON.stringify(out,null,2));
console.log('Postman unique:',post.length);
console.log('Frontend calls:',front.length);
console.log('Matched frontend calls:',used.length);
console.log('Unmatched frontend calls:',unmatchedFront.length);
console.log('Unused postman unique endpoints:',unusedPost.length);
console.log('Unmatched frontend list:');
unmatchedFront.forEach(f=>console.log(f.method,f.endpoint,f.file+':'+f.line));
