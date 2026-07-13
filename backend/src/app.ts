import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config';
import { createApiRouter } from './routes';

/** Overrides let tests inject fake keys, a tiny rate limit, or a short timeout. */
export interface CreateAppOptions {
  orsApiKey?: string;
  openweatherApiKey?: string;
  rateLimitPerMin?: number;
  upstreamTimeoutMs?: number;
  nodeEnv?: string;
  corsAllowedOrigins?: string[];
}

/**
 * Express gateway factory. Exported (not auto-started) so tests can drive it with supertest
 * in-process. Upstream calls go through MSW in tests — no live sockets, no real keys.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const nodeEnv = options.nodeEnv ?? config.nodeEnv;
  const corsAllowedOrigins = options.corsAllowedOrigins ?? config.corsAllowedOrigins;

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: corsAllowedOrigins.length > 0 ? corsAllowedOrigins : false,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  // Liveness/readiness probe — wired to the Docker HEALTHCHECK and Cloud Run probe.
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Secure proxy gateway: validates input, injects server secrets, never leaks them.
  app.use(
    '/api',
    createApiRouter({
      orsApiKey: options.orsApiKey ?? config.orsApiKey,
      openweatherApiKey: options.openweatherApiKey ?? config.openweatherApiKey,
      rateLimitPerMin: options.rateLimitPerMin ?? config.rateLimitPerMin,
      upstreamTimeoutMs: options.upstreamTimeoutMs ?? config.upstreamTimeoutMs,
    }),
  );

  // Static SPA (prod only): serve the built frontend, with an SPA history fallback
  // registered AFTER /api so deep-link refreshes work but never shadow the API.
  if (nodeEnv === 'production') {
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

  // Centralized error handler → clean JSON (the Radix-toast error contract). Respects the
  // status of well-known errors (e.g. express.json's 413 PayloadTooLargeError).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = errorStatus(err);
    const message = err instanceof Error ? err.message : 'internal_error';
    res.status(status).json({
      error: status === 413 ? 'payload_too_large' : 'internal_error',
      message,
    });
  });

  return app;
}

function errorStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null) {
    const e = err as { status?: unknown; statusCode?: unknown };
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
  }
  return 500;
}
