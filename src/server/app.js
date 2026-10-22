import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' });
  if (req.path.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      const allowedHosts = [req.get('host'), 'localhost:5173', '127.0.0.1:5173'];
      if (!allowedHosts.includes(origin.host)) return res.status(403).json({ error: { message: 'Cross-site request rejected.' } });
    } catch {
      return res.status(403).json({ error: { message: 'Invalid request origin.' } });
    }
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: { message: 'API route not found.' } }));
app.use(express.static(path.join(root, 'dist')));
app.get('/', (req, res) => res.sendFile(path.join(root, 'dist/index.html')));
app.use((req, res) => res.status(404).json({ error: { message: 'Page not found.' } }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON.'; }
  if (error.type === 'entity.too.large') { status = 413; message = 'Request body exceeds 1 MB.'; }
  if (['23503', '23514', '22P02', '22023'].includes(error.code)) { status = 422; message = 'Data violates a constraint. Check the values and geometry.'; }
  if (['ECONNREFUSED', 'ENOTFOUND', '57P03', '53300'].includes(error.code) || error.message?.includes('timeout')) { status = 503; message = 'Database unavailable. Check the PostgreSQL connection.'; }
  if (status >= 500) { console.error(error); message = status === 503 ? message : 'Could not complete the request. Please try again.'; }
  res.status(status).json({ error: { message, ...(error.details ? { details: error.details } : {}) } });
});
