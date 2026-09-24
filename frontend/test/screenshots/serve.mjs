/**
 * Estáticos de dist/ con fallback SPA (harness visual determinista).
 * Uso: `node test/screenshots/serve.mjs [port]` (default 5173, IPv4).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.argv[2] ?? '5173');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const file = join(DIST, decodeURIComponent(path));
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      body = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(body);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`[serve] dist en http://127.0.0.1:${PORT}`));
