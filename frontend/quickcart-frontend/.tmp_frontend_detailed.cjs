const fs=require('fs');
const path=require('path');
function walk(dir){
  let out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out=out.concat(walk(p));
    else if(/\.(js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}
function nearestFunction(lines, idx){
  for(let i=idx;i>=0 && i>idx-120;i--){
    const l=lines[i];
    let m=l.match(/const\s+([A-Za-z0-9_]+)\s*=\s*async\s*\(/);
    if(m) return m[1];
    m=l.match(/const\s+([A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>/);
    if(m) return m[1];
    m=l.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    if(m) return m[1];
  }
  return '';
}
const files=walk('src');
const calls=[];
for(const f of files){
  const text=fs.readFileSync(f,'utf8');
  const lines=text.split(/\r?\n/);
  lines.forEach((line,i)=>{
    const m=line.match(/\bapi\.(get|post|put|patch|delete)\s*\(\s*([^,\)]+)/i);
    if(!m) return;
    if(line.includes('Map.get(')||line.includes('.delete(')&&!line.includes('api.')) return;
    const method=m[1].toUpperCase();
    let endpoint=m[2].trim();
    endpoint=endpoint.replace(/^`|`$/g,'').replace(/^"|"$/g,'').replace(/^'|'$/g,'');
    const fn=nearestFunction(lines,i);
    const context=lines.slice(Math.max(0,i-3),Math.min(lines.length,i+6)).join('\n');
    calls.push({file:f.replace(/\\/g,'/'),line:i+1,method,endpoint,functionName:fn,context});
  });
}
fs.writeFileSync('frontend_api_calls_detailed.json',JSON.stringify(calls,null,2));
console.log('Detailed calls:',calls.length);
console.log(calls.map(c=>`${c.file}:${c.line} ${c.method} ${c.endpoint} [${c.functionName}]`).join('\n'));
