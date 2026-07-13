import { z } from 'zod';

/**
 * OpenWeather One Call 3.0 response (subset). We KEEP `minutely` (the precipitation
 * nowcast = the "real-time rain" feature) and `alerts` (severe-weather warnings = the
 * "rain alerts" feature). Only `hourly`/`daily` may be trimmed server-side. See SPEC §3.2.
 */
export const OpenWeatherOneCallSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  timezone: z.string().optional(),
  current: z
    .object({
      dt: z.number(),
      temp: z.number(),
      wind_speed: z.number(),
    })
    .partial()
    .optional(),
  minutely: z.array(z.object({ dt: z.number(), precipitation: z.number() })).optional(),
  hourly: z
    .array(
      z
        .object({ dt: z.number(), temp: z.number(), wind_speed: z.number(), pop: z.number() })
        .partial(),
    )
    .optional(),
  daily: z.array(z.object({ dt: z.number() }).passthrough()).optional(),
  alerts: z
    .array(
      z
        .object({
          sender_name: z.string(),
          event: z.string(),
          start: z.number(),
          end: z.number(),
          description: z.string(),
        })
        .partial(),
    )
    .optional(),
});

export type OpenWeatherOneCall = z.infer<typeof OpenWeatherOneCallSchema>;
