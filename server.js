// Minimal static file server for local preview (no dependencies).
// Usage: node server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.argv[2]) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.hdr': 'application/octet-stream',
};

// Dev-only: tools/export-models.html POSTs each exported guitar here and it is written to models/.
// Accepts only plain "name.glb" file names (no paths), up to 80 MB.
function saveModel(req, res, url) {
  const name = url.searchParams.get('name') || '';
  if (!/^[a-z0-9-]+\.glb$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
  const chunks = []; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > 80e6) { res.writeHead(413); res.end(); req.destroy(); } else chunks.push(c); });
  req.on('end', () => {
    if (res.writableEnded) return;
    fs.mkdirSync(path.join(root, 'models'), { recursive: true });
    fs.writeFile(path.join(root, 'models', name), Buffer.concat(chunks), (err) => {
      res.writeHead(err ? 500 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err ? { error: String(err) } : { saved: `models/${name}`, bytes: size }));
    });
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__save-model') return saveModel(req, res, url);
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving on http://localhost:${port}`));
