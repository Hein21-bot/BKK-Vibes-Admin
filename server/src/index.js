import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { ensureUsers } from './lib/bootstrap.js';

const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS ---
// Auth is a Bearer token (no cookies), so origin rules are just a courtesy.
// Always allowed: no-origin requests (curl / server-to-server), localhost,
// *.pages.dev / *.workers.dev (Cloudflare) and *.onrender.com (Render static sites).
// CLIENT_ORIGIN adds extra exact origins (comma-separated). Trailing slashes
// are ignored. Set CLIENT_ORIGIN="*" to allow everything.
const extraOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowAll = extraOrigins.includes('*');

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl, health checks, same-origin
  if (allowAll) return true;
  const clean = origin.replace(/\/+$/, '');
  if (extraOrigins.includes(clean)) return true;
  try {
    const { hostname, protocol } = new URL(clean);
    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    if (hostname === 'pages.dev' || hostname.endsWith('.pages.dev')) return true;
    if (hostname.endsWith('.workers.dev')) return true;
    if (hostname.endsWith('.onrender.com')) return true;
  } catch {
    /* fall through */
  }
  return false;
}

// Disallowed origins get a normal response with no CORS headers — the browser
// enforces the block; we don't 500. Allowed origins get full CORS.
app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)) }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

ensureUsers()
  .catch((e) => console.error('ensureUsers failed:', e.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  });
