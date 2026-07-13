import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OrsRouteResponseSchema,
  OpenWeatherOneCallSchema,
  OverpassResponseSchema,
  RainViewerMapsSchema,
} from './index';

// Locks the frozen fixtures to their zod contracts. When a human later swaps a
// hand-authored fixture for a captured-real upstream response, any shape drift fails
// HERE — loudly and locally — instead of silently corrupting downstream logic.
function loadFixture(name: string): unknown {
  const path = resolve(process.cwd(), 'test/fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('upstream fixtures satisfy their contracts', () => {
  it('ORS foot-hiking/geojson fixture', () => {
    const parsed = OrsRouteResponseSchema.safeParse(loadFixture('ors-foot-hiking.geojson'));
    expect(parsed.success, parsed.error?.toString()).toBe(true);
  });

  it('OpenWeather One Call fixture keeps minutely + alerts', () => {
    const data = loadFixture('openweather-onecall.json');
    const parsed = OpenWeatherOneCallSchema.safeParse(data);
    expect(parsed.success, parsed.error?.toString()).toBe(true);
    // Guard the product's headline features against a regressive `exclude=`.
    expect(parsed.success && parsed.data.minutely && parsed.data.minutely.length).toBeTruthy();
    expect(parsed.success && parsed.data.alerts && parsed.data.alerts.length).toBeTruthy();
  });

  it('Overpass POI fixture', () => {
    const parsed = OverpassResponseSchema.safeParse(loadFixture('overpass-poi.json'));
    expect(parsed.success, parsed.error?.toString()).toBe(true);
  });

  it('RainViewer weather-maps fixture', () => {
    const parsed = RainViewerMapsSchema.safeParse(loadFixture('rainviewer-weather-maps.json'));
    expect(parsed.success, parsed.error?.toString()).toBe(true);
  });
});
