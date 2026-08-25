import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export interface StaticServer {
  readonly server: http.Server;
  readonly url: string;
}

function isInsideRoot(rootDir: string, candidate: string): boolean {
  const relative = path.relative(rootDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function sendFile(res: http.ServerResponse, filePath: string, status = 200): void {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(res);
}

function listen(rootDir: string, port: number): Promise<StaticServer> {
  return new Promise((resolve, reject) => {
    const indexPath = path.join(rootDir, 'index.html');
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const filePath = path.normalize(path.join(rootDir, relative));

      if (!isInsideRoot(rootDir, filePath) && filePath !== path.normalize(rootDir)) {
        res.writeHead(403).end();
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
          sendFile(res, filePath);
          return;
        }

        sendFile(res, indexPath);
      });
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo obtener el puerto del servidor estático.'));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

/** Sirve el build de Angular solo en loopback, con fallback SPA a index.html. */
export async function startStaticServer(rootDir: string, preferredPort = 17891): Promise<StaticServer> {
  try {
    return await listen(rootDir, preferredPort);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') {
      return listen(rootDir, 0);
    }
    throw error;
  }
}
