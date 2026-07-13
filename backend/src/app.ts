import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config';

/**
 * Express gateway factory. Exported (not auto-started) so tests can drive it with
 * supertest in-process, with zero open ports and zero live upstream calls.
 *
 * Phase 1 (loop) fills in /api/route and /api/weather with: zod input validation
 * (lat∈[-90,90], lon∈[-180,180], bounded coordinate arrays), per-IP rate limiting
 * under the 40/min ORS ceiling, hardcoded upstream URLs (no client-supplied hosts),
 * 8–10s timeouts, short-TTL caching, and 429→Retry-After passthrough.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : false,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  // Liveness/readiness probe — wired to the Docker HEALTHCHECK and Cloud Run probe.
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // API gateway endpoints — advertise Not Implemented until the loop wires them.
  app.all('/api/route', notImplemented);
  app.all('/api/weather', notImplemented);

  // Static SPA (prod only): serve the built frontend, with an SPA history fallback
  // registered AFTER /api so deep-link refreshes work but never shadow the API.
  if (config.nodeEnv === 'production') {
    const publicDir = path.join(__dirname, '..', 'public');
    app.use(express.static(publicDir));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  // 404 for anything unmatched.
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', path: req.path });
  });

  // Centralized error handler → clean JSON (the Radix-toast error contract).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'internal_error';
    res.status(500).json({ error: 'internal_error', message });
  });

  return app;
}

function notImplemented(_req: Request, res: Response): void {
  res.status(501).json({ error: 'not_implemented' });
}
