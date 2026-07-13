import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateXML } from 'xmllint-wasm';
import { buildGpxFiles, buildRouteGpx } from './gpxExport';
import type { RouteAnalysis } from './route';
import type { SlicePlan } from './slicing';

const xsd = readFileSync(resolve(process.cwd(), 'test/fixtures/gpx.xsd'), 'utf-8');

function makeRoute(): RouteAnalysis {
  const points = Array.from({ length: 10 }, (_, i) => ({
    lng: 11.4 + i * 0.002,
    lat: 47.25 + i * 0.002,
    ele: 900 + i * 40,
    distanceMeters: i * 200,
    timeSeconds: i * 3600,
  }));
  return {
    points,
    distanceMeters: 1800,
    ascentMeters: 360,
    descentMeters: 0,
    movingSeconds: 32400,
    difficultySegments: [],
  };
}

const twoDayPlan: SlicePlan = {
  days: [
    {
      index: 0,
      startIndex: 0,
      endIndex: 5,
      movingSeconds: 18000,
      distanceMeters: 1000,
      shelterAtEnd: { id: 'h', lng: 11.41, lat: 47.26, kind: 'alpine_hut', name: 'Demo Hut' },
    },
    {
      index: 1,
      startIndex: 5,
      endIndex: 9,
      movingSeconds: 14400,
      distanceMeters: 800,
      shelterAtEnd: null,
    },
  ],
  warnings: [],
};

async function allValid(contents: string[]): Promise<boolean> {
  const result = await validateXML({
    xml: contents.map((c, i) => ({ fileName: `f${i}.gpx`, contents: c })),
    schema: [xsd],
  });
  return result.valid;
}

describe('buildGpxFiles', () => {
  it('emits a single combined file for a one-day route', () => {
    const files = buildGpxFiles(makeRoute(), null);
    expect(files).toHaveLength(1);
    expect(files[0]!.filename).toBe('pathfinder-route.gpx');
  });

  it('emits a combined file + one per day for a multi-day plan, all XSD-valid', async () => {
    const files = buildGpxFiles(makeRoute(), twoDayPlan);
    expect(files.map((f) => f.filename)).toEqual([
      'pathfinder-route.gpx',
      'pathfinder-day-1.gpx',
      'pathfinder-day-2.gpx',
    ]);
    expect(await allValid(files.map((f) => f.contents))).toBe(true);
  });

  it('includes each shelter as a waypoint in the combined file', () => {
    const gpx = buildRouteGpx(makeRoute(), twoDayPlan);
    expect(gpx).toContain('<wpt');
    expect(gpx).toContain('Demo Hut');
  });
});
