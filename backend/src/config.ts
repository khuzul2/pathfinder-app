import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Validated runtime configuration. Server secrets (ORS/OpenWeather) live ONLY here,
 * server-side — they must never be sent to the client. Keys default to empty so the
 * app boots under the hermetic test/dev loop (which uses MSW mocks, not real keys);
 * the real /api handlers (Phase 1) must fail fast if a key is missing in production.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  ORS_API_KEY: z.string().default(''),
  OPENWEATHER_API_KEY: z.string().default(''),
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  orsApiKey: parsed.ORS_API_KEY,
  openweatherApiKey: parsed.OPENWEATHER_API_KEY,
  corsAllowedOrigins: parsed.CORS_ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitPerMin: parsed.RATE_LIMIT_PER_MIN,
  upstreamTimeoutMs: parsed.UPSTREAM_TIMEOUT_MS,
} as const;

export type AppConfig = typeof config;
