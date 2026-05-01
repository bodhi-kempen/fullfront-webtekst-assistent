import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { frameEmbed } from './middleware/frame.js';
import { contentRouter } from './routes/content.js';
import { editingRouter } from './routes/editing.js';
import { exportRouter } from './routes/export.js';
import { interviewRouter } from './routes/interview.js';
import { projectsRouter } from './routes/projects.js';
import { strategyRouter } from './routes/strategy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In dev: __dirname = backend/src     → frontendDist = ../../frontend/dist
// In prod (after tsc): __dirname = backend/dist → frontendDist = ../../frontend/dist
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');
const SERVE_FRONTEND = existsSync(FRONTEND_DIST);

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(frameEmbed);
app.use(express.json({ limit: '1mb' }));

// Request logger
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - t0}ms)`
    );
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv });
});

// API
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:id/interview', interviewRouter);
app.use('/api/projects/:id/strategy', strategyRouter);
app.use('/api/projects/:id', contentRouter);
app.use('/api/sections', editingRouter);
app.use('/api/projects/:id/export', exportRouter);

// Static frontend + SPA fallback (only when a built frontend/dist exists).
// In development the frontend runs separately on Vite (:5173) and this
// branch is skipped because frontend/dist hasn't been built.
if (SERVE_FRONTEND) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Backend listening on :${env.port} (env=${env.nodeEnv})`);
  if (SERVE_FRONTEND) {
    console.log(`Serving frontend from ${FRONTEND_DIST}`);
  } else {
    console.log('Frontend not built — API-only mode (use Vite dev server separately).');
  }
});
