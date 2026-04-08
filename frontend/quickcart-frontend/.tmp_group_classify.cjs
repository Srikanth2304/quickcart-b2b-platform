const fs=require('fs');
const arr=JSON.parse(fs.readFileSync('postman_unique_endpoints.json','utf8'));
const groups=['Auth APIs','Product APIs','Category APIs','Brand APIs','Cart APIs','Order APIs','Shipment APIs','Return APIs','Refund APIs','Payment APIs','Address APIs','Admin APIs'];
const g={}; groups.forEach(k=>g[k]=[]);
function classify(ep){
  const p=(ep||'').toLowerCase();
  if(p.startsWith('/auth/')) return 'Auth APIs';
  if(p.startsWith('/products/')){
    if(p.includes('/refund')) return 'Refund APIs';
    return 'Product APIs';
  }
  if(p.startsWith('/categories')) return 'Category APIs';
  if(p.startsWith('/brands')) return 'Brand APIs';
  if(p.startsWith('/cart/')) return 'Cart APIs';
  if(p.startsWith('/shipments/')) return 'Shipment APIs';
  if(p.startsWith('/returns/')) return 'Return APIs';
  if(p.includes('/refund')) return 'Refund APIs';
  if(p.startsWith('/payments/')) return 'Payment APIs';
  if(p.startsWith('/addresses/')) return 'Address APIs';
  if(p==='/addresses') return 'Address APIs';
  if(p.startsWith('/orders/')) return 'Order APIs';
  if(p==='/orders') return 'Order APIs';
  return 'Admin APIs';
}
arr.forEach(e=>{ g[classify(e.endpoint)].push(e); });
fs.writeFileSync('postman_grouped_for_report.json',JSON.stringify(g,null,2));
for(const k of groups) console.log(k,g[k].length);
