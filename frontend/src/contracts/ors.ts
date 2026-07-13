import { z } from 'zod';

/**
 * OpenRouteService `POST /v2/directions/foot-hiking/geojson` response (the subset we use).
 * The `/geojson` format suffix is REQUIRED so geometry.coordinates are raw
 * [lng, lat, elevation] arrays — the base endpoint returns an encoded polyline STRING
 * that a standard decoder cannot read (3D-encoded when elevation:true). See SPEC §2.1.
 */
const Position = z.tuple([z.number(), z.number()]).rest(z.number()); // [lng, lat, (ele)]

/** ORS surface extra: index-range triples [startVertexIdx, endVertexIdx, surfaceCode]. */
const SurfaceExtra = z.object({
  values: z.array(z.tuple([z.number(), z.number(), z.number()])),
});

export const OrsRouteResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        geometry: z.object({
          type: z.literal('LineString'),
          coordinates: z.array(Position).min(2),
        }),
        properties: z.object({
          summary: z.object({ distance: z.number(), duration: z.number() }).partial().optional(),
          extras: z
            .object({
              surface: SurfaceExtra.optional(),
              traildifficulty: SurfaceExtra.optional(),
              steepness: SurfaceExtra.optional(),
            })
            .optional(),
        }),
      }),
    )
    .min(1),
});

export type OrsRouteResponse = z.infer<typeof OrsRouteResponseSchema>;
