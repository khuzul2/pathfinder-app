import { z } from 'zod';

/**
 * Waymarked Trails hiking API (subset). `list/search` returns fuzzy name matches; `details/relation/
 * {id}?geometry=geojson` returns route metadata + a superroute geometry tree (kept opaque here and
 * walked defensively by `flattenTrailGeometry`). Keyless + CORS-open, so callable browser-direct.
 */
export const WmtSearchResultSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  ref: z.string().optional(),
  itinerary: z.array(z.string()).optional(),
  group: z.string().optional(),
});

export const WmtSearchResponseSchema = z.object({
  results: z.array(WmtSearchResultSchema),
});

export const WmtDetailsSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  ref: z.string().optional(),
  route: z.unknown().optional(),
});

export type WmtSearchResult = z.infer<typeof WmtSearchResultSchema>;
