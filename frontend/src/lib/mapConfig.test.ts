import { describe, it, expect } from 'vitest';
import { ATTRIBUTIONS, MAP_STYLE, DEFAULT_ZOOM } from './mapConfig';

describe('map configuration', () => {
  it('uses the Outdoors (topographic) style', () => {
    expect(MAP_STYLE).toContain('outdoors');
    expect(DEFAULT_ZOOM).toBeGreaterThan(0);
  });

  it('credits every required data source (a shipped requirement)', () => {
    const joined = ATTRIBUTIONS.join(' ').toLowerCase();
    expect(joined).toContain('openstreetmap');
    expect(joined).toContain('mapbox');
    expect(joined).toContain('openrouteservice');
    expect(joined).toContain('rainviewer');
  });
});
