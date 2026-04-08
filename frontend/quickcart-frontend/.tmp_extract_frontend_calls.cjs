const fs = require('fs');
const path = require('path');
function walk(dir){
  let out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out=out.concat(walk(p));
    else if(/\.(js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}
const files=walk('src');
const calls=[];
for(const f of files){
  const text=fs.readFileSync(f,'utf8');
  const lines=text.split(/\r?\n/);
  lines.forEach((line,i)=>{
    const m=line.match(/\bapi\.(get|post|put|patch|delete)\s*\(\s*([`'"])([^`'"]+)\2/i);
    if(m){
      calls.push({file:f.replace(/\\/g,'/'),line:i+1,method:m[1].toUpperCase(),endpoint:m[3],code:line.trim()});
    }
  });
}
fs.writeFileSync('frontend_api_calls_extracted.json',JSON.stringify(calls,null,2));
console.log('Extracted frontend API calls:',calls.length);
console.log(calls.map(c=>`${c.file}:${c.line} ${c.method} ${c.endpoint}`).join('\n'));
