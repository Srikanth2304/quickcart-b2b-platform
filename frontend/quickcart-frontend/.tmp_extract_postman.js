const fs = require('fs');
const p = 'src/b2bRetail.postman_collection.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const out = [];
function walk(items, folders = []) {
  (items || []).forEach((it) => {
    if (it.item) return walk(it.item, [...folders, it.name]);
    if (!it.request) return;
    const u = it.request.url || {};
    const path = Array.isArray(u.path) ? '/' + u.path.join('/') : '';
    const query = Array.isArray(u.query)
      ? u.query.map((q) => ({ key: q.key || '', value: q.value || '', disabled: !!q.disabled }))
      : [];
    const body = it.request.body || {};
    const responses = (it.response || []).map((r) => ({
      name: r.name || '',
      code: r.code || null,
      body: r.body || ''
    }));
    out.push({
      folder: folders.join(' > '),
      name: it.name || '',
      method: it.request.method || '',
      rawUrl: u.raw || '',
      path,
      query,
      bodyMode: body.mode || '',
      bodyRaw: body.raw || '',
      responses
    });
  });
}
walk(j.item || []);
fs.writeFileSync('postman_endpoints_extracted.json', JSON.stringify(out, null, 2));
console.log('Extracted endpoints:', out.length);
console.log(out.slice(0, 20).map((e) => `${e.method} ${e.path} :: ${e.folder} :: ${e.name}`).join('\n'));
