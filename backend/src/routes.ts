import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RouteRequestSchema, WeatherQuerySchema, BboxQuerySchema } from './validation';
import { fetchRoute, fetchWeather, fetchPois, fetchRadar, UpstreamError } from './upstreams';
import { TtlCache } from './cache';

export interface RouterConfig {
  orsApiKey: string;
  openweatherApiKey: string;
  rateLimitPerMin: number;
  upstreamTimeoutMs: number;
}

const CACHE_TTL = {
  route: 300_000, // 5 min
  weather: 600_000, // 10 min
  pois: 300_000,
  radar: 300_000,
} as const;

export function createApiRouter(cfg: RouterConfig): Router {
  const router = Router();
  const cache = new TtlCache();

  // Per-IP rate limiter — the real throttle (the client debounce is bypassable). Tuned under
  // the 40/min ORS ceiling in prod; a shared store is needed once Cloud Run autoscales.
  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: cfg.rateLimitPerMin,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({ error: 'rate_limited' });
      },
    }),
  );

  router.post('/route', async (req, res) => {
    const parsed = RouteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    if (!cfg.orsApiKey) {
      res.status(503).json({ error: 'ors_key_missing' });
      return;
    }
    const key = `route:${JSON.stringify(parsed.data.coordinates)}`;
    try {
      let data = cache.get(key);
      if (data === undefined) {
        data = await fetchRoute(cfg.orsApiKey, parsed.data, cfg.upstreamTimeoutMs);
        cache.set(key, data, CACHE_TTL.route);
      }
      res.json(data);
    } catch (err) {
      sendUpstreamError(err, res);
    }
  });

  router.get('/weather', async (req, res) => {
    const parsed = WeatherQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    if (!cfg.openweatherApiKey) {
      res.status(503).json({ error: 'weather_key_missing' });
      return;
    }
    const { lat, lon } = parsed.data;
    const key = `weather:${lat.toFixed(3)},${lon.toFixed(3)}`;
    try {
      let data = cache.get(key);
      if (data === undefined) {
        data = await fetchWeather(cfg.openweatherApiKey, lat, lon, cfg.upstreamTimeoutMs);
        cache.set(key, data, CACHE_TTL.weather);
      }
      res.json(data);
    } catch (err) {
      sendUpstreamError(err, res);
    }
  });

  router.get('/pois', async (req, res) => {
    const parsed = BboxQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    const bbox = parsed.data;
    const key = `pois:${[bbox.south, bbox.west, bbox.north, bbox.east].map((n) => n.toFixed(2)).join(',')}`;
    try {
      let data = cache.get(key);
      if (data === undefined) {
        data = await fetchPois(bbox);
        cache.set(key, data, CACHE_TTL.pois);
      }
      res.json(data);
    } catch (err) {
      sendUpstreamError(err, res);
    }
  });

  router.get('/radar', async (_req, res) => {
    const key = 'radar';
    try {
      let data = cache.get(key);
      if (data === undefined) {
        data = await fetchRadar(cfg.upstreamTimeoutMs);
        cache.set(key, data, CACHE_TTL.radar);
      }
      res.json(data);
    } catch (err) {
      sendUpstreamError(err, res);
    }
  });

  return router;
}

function sendUpstreamError(err: unknown, res: Response): void {
  if (err instanceof UpstreamError) {
    if (err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter);
    }
    res.status(err.status).json({ error: 'upstream_error', message: err.message });
    return;
  }
  res.status(500).json({ error: 'internal_error' });
}
