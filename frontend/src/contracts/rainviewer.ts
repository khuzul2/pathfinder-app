import { z } from 'zod';

/**
 * RainViewer `GET /public/weather-maps.json` (subset). Tile URLs MUST be built from the
 * returned `host` + frame `path` (both versioned/dynamic) — never hardcoded. Post-2026
 * free tier: max zoom 7, color scheme id 2 ("Universal Blue") only. See SPEC §3.3.
 */
const Frame = z.object({
  time: z.number(),
  path: z.string(),
});

export const RainViewerMapsSchema = z.object({
  version: z.string().optional(),
  generated: z.number().optional(),
  host: z.string(),
  radar: z.object({
    past: z.array(Frame),
    nowcast: z.array(Frame).optional(),
  }),
});

export type RainViewerMaps = z.infer<typeof RainViewerMapsSchema>;
