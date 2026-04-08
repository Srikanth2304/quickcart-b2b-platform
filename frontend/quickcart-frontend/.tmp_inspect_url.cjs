const fs=require('fs');
const j=JSON.parse(fs.readFileSync('src/b2bRetail.postman_collection.json','utf8').replace(/^\uFEFF/,''));
function walk(items,folders=[]){
 for(const it of (items||[])){
  if(it.item){ walk(it.item,[...folders,it.name]); continue; }
  if(!it.request) continue;
  const u=it.request.url;
  console.log('NAME',it.name,'FOLDER',folders.join(' > '));
  console.log('URLTYPE',typeof u, JSON.stringify(u).slice(0,300));
  break;
 }
}
walk(j.item||[]);
