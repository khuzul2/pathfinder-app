import { z } from 'zod';

/**
 * Mapbox Geocoding v6 (forward/autocomplete) response — subset we consume. A GeoJSON
 * FeatureCollection; each feature carries a place `name` + a formatted `place_formatted`
 * context and a point geometry. Kept lenient (most fields optional) so a partial upstream
 * payload degrades gracefully rather than throwing. See SPEC §3.4.
 */
export const MapboxGeocodeSchema = z.object({
  features: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      geometry: z
        .object({
          coordinates: z.array(z.number()),
        })
        .optional(),
      properties: z
        .object({
          mapbox_id: z.string().optional(),
          name: z.string().optional(),
          name_preferred: z.string().optional(),
          place_formatted: z.string().optional(),
          full_address: z.string().optional(),
          feature_type: z.string().optional(),
          coordinates: z.object({ longitude: z.number(), latitude: z.number() }).optional(),
        })
        .optional(),
    }),
  ),
});

export type MapboxGeocode = z.infer<typeof MapboxGeocodeSchema>;
