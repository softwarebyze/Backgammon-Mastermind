import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
};

/** Mirrors vercel.json: legal pages, real files, then the SPA shell. */
function resolve(distDir: string, pathname: string): string {
  const legal = pathname.match(/^\/(privacy|terms)\/?$/);
  if (legal) {
    return join(distDir, legal[1], 'index.html');
  }
  const file = join(distDir, normalize(decodeURIComponent(pathname)));
  if (file.startsWith(distDir) && existsSync(file) && statSync(file).isFile()) {
    return file;
  }
  return join(distDir, 'index.html');
}

/** Serves an exported web build on a random localhost port (a secure context). */
export function serveDist(distDir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const file = resolve(distDir, new URL(req.url ?? '/', 'http://localhost').pathname);
    res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
    if (file.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'max-age=0, must-revalidate');
    }
    createReadStream(file).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolveServer({
        url: `http://localhost:${port}`,
        close: () => new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => done());
        }),
      });
    });
  });
}
