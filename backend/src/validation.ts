import { z } from 'zod';

// Server-side input validation. This is a SECURITY boundary, not a nicety: it bounds the
// values forwarded to the keyed upstreams (no injection, no giant/expensive requests) and,
// combined with hardcoded upstream URLs, closes the SSRF surface.

const Longitude = z.number().gte(-180).lte(180);
const Latitude = z.number().gte(-90).lte(90);

/** ORS foot profile — an allowlist (not a client-supplied URL) so it can't widen the SSRF surface. */
export const OrsProfileSchema = z.enum(['foot-hiking', 'foot-walking']);
export type OrsProfile = z.infer<typeof OrsProfileSchema>;

/** POST /api/route body — bounded [lng, lat] waypoints, an optional foot profile, and a flag
 * to request alternative routes (honored only for a simple start→end pair). */
export const RouteRequestSchema = z.object({
  coordinates: z
    .array(z.tuple([Longitude, Latitude]))
    .min(2)
    .max(50),
  profile: OrsProfileSchema.optional(),
  alternatives: z.boolean().optional(),
});
export type RouteRequest = z.infer<typeof RouteRequestSchema>;

/** GET /api/weather query — a single coordinate. */
export const WeatherQuerySchema = z.object({
  lat: z.coerce.number().pipe(Latitude),
  lon: z.coerce.number().pipe(Longitude),
});
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;

/** GET /api/pois query — a bounding box (order: south,west,north,east). */
export const BboxQuerySchema = z
  .object({
    south: z.coerce.number().pipe(Latitude),
    west: z.coerce.number().pipe(Longitude),
    north: z.coerce.number().pipe(Latitude),
    east: z.coerce.number().pipe(Longitude),
  })
  .refine((b) => b.south <= b.north && b.west <= b.east, {
    message: 'bbox must be ordered south<=north, west<=east',
  });
export type BboxQuery = z.infer<typeof BboxQuerySchema>;
