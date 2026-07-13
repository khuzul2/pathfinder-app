import { z } from 'zod';

/**
 * Overpass API response (subset). We query `tourism=alpine_hut`, `tourism=camp_site`,
 * and `natural=spring` inside a bbox (order: south,west,north,east). See SPEC §3.1.
 */
export const OverpassResponseSchema = z.object({
  elements: z.array(
    z.object({
      type: z.string(),
      id: z.number(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

export type OverpassResponse = z.infer<typeof OverpassResponseSchema>;
