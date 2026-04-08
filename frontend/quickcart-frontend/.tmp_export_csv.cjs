const fs = require('fs');
const path = require('path');

const postman = JSON.parse(fs.readFileSync('postman_unique_endpoints.json','utf8'));
const frontend = JSON.parse(fs.readFileSync('frontend_api_calls_extracted.json','utf8'));
const detailed = JSON.parse(fs.readFileSync('frontend_api_calls_detailed.json','utf8'));
const cross = JSON.parse(fs.readFileSync('api_crosscheck_report.json','utf8'));

const outDir = 'api-validation-export';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => csvEscape(r[h])).join(','));
  return lines.join('\n');
}
function normPath(p){
  return String(p || '').replace('{{baseUrl}}','').replace(/^https?:\/\/[^/]+/,'').replace(/\$\{[^}]+\}/g,'{var}').replace(/\{\{[^}]+\}\}/g,'{var}');
}

const postmanRows = postman.map(e => ({
  domain: e.domain || '',
  folder: e.folder || '',
  name: e.name || '',
  method: e.method || '',
  endpoint: e.endpoint || '',
  rawUrl: e.rawUrl || '',
  queryParams: (e.query || []).map(q => q.key).join('|'),
  requestBodyShape: (e.requestBodyShape || []).join('|'),
  responseShape: (e.responseShape || []).join('|')
}));

const detailedMap = new Map(detailed.map(d => [`${d.file}:${d.line}:${d.method}:${d.endpoint}`, d]));
const frontendRows = frontend.map(c => {
  const key = `${c.file}:${c.line}:${c.method}:${c.endpoint}`;
  const d = detailedMap.get(key);
  const base = path.basename(c.file || '');
  const component = base.replace(/\.(jsx|js)$/i, '');
  return {
    file: c.file,
    line: c.line,
    component,
    functionName: d?.functionName || '',
    method: c.method,
    endpoint: c.endpoint,
    normalizedEndpoint: normPath(c.endpoint),
    code: c.code || ''
  };
});

const usedRows = (cross.used || []).map(u => ({
  status: 'USED',
  method: u.frontend.method,
  postmanEndpoint: u.postman.endpoint,
  frontendEndpoint: u.frontend.endpoint,
  file: u.frontend.file,
  line: u.frontend.line,
  postmanName: u.postman.name,
  postmanDomain: u.postman.domain
}));

const unusedRows = (cross.unusedPost || []).map(u => ({
  status: 'UNUSED_POSTMAN',
  method: u.method,
  postmanEndpoint: u.endpoint,
  frontendEndpoint: '',
  file: '',
  line: '',
  postmanName: u.name,
  postmanDomain: u.domain
}));

const unmatchedFrontendRows = (cross.unmatchedFront || []).map(f => ({
  status: 'UNMATCHED_FRONTEND',
  method: f.method,
  postmanEndpoint: '',
  frontendEndpoint: f.endpoint,
  file: f.file,
  line: f.line,
  postmanName: '',
  postmanDomain: ''
}));

const diffRows = [...usedRows, ...unusedRows, ...unmatchedFrontendRows];

fs.writeFileSync(path.join(outDir, 'postman_unique_endpoints.csv'), toCsv(postmanRows, [
  'domain','folder','name','method','endpoint','rawUrl','queryParams','requestBodyShape','responseShape'
]));

fs.writeFileSync(path.join(outDir, 'frontend_api_calls.csv'), toCsv(frontendRows, [
  'file','line','component','functionName','method','endpoint','normalizedEndpoint','code'
]));

fs.writeFileSync(path.join(outDir, 'api_used_unused_diff.csv'), toCsv(diffRows, [
  'status','method','postmanEndpoint','frontendEndpoint','file','line','postmanName','postmanDomain'
]));

fs.writeFileSync(path.join(outDir, 'unused_postman_endpoints.csv'), toCsv(unusedRows, [
  'status','method','postmanEndpoint','postmanName','postmanDomain'
]));

fs.writeFileSync(path.join(outDir, 'unmatched_frontend_calls.csv'), toCsv(unmatchedFrontendRows, [
  'status','method','frontendEndpoint','file','line'
]));

console.log('Exported CSV files to', outDir);
console.log('Postman unique endpoints:', postmanRows.length);
console.log('Frontend calls:', frontendRows.length);
console.log('Used rows:', usedRows.length);
console.log('Unused Postman rows:', unusedRows.length);
console.log('Unmatched frontend rows:', unmatchedFrontendRows.length);
