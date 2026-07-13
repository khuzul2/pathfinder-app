import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateXML } from 'xmllint-wasm';
import { XMLParser } from 'fast-xml-parser';
import { buildGpxCourse, simplifyTrack, escapeXml, type GpxTrackPoint } from './gpx';

const xsd = readFileSync(resolve(process.cwd(), 'test/fixtures/gpx.xsd'), 'utf-8');

const track: GpxTrackPoint[] = [
  { lng: 11.5761, lat: 48.1374, ele: 520 },
  { lng: 11.5779, lat: 48.1382, ele: 528 },
  { lng: 11.5798, lat: 48.1391, ele: 542 },
  { lng: 11.582, lat: 48.1402, ele: 553 },
];

async function isValidGpx(gpx: string): Promise<boolean> {
  const result = await validateXML({
    xml: [{ fileName: 'route.gpx', contents: gpx }],
    schema: [xsd],
  });
  return result.valid;
}

describe('buildGpxCourse — GPX 1.1 XSD validity', () => {
  it('validates a course (with a shelter waypoint) against gpx.xsd', async () => {
    const gpx = buildGpxCourse(track, {
      name: 'Karwendel Day 1',
      waypoints: [{ lng: 11.582, lat: 48.1402, ele: 553, name: 'Pfeishütte' }],
    });
    expect(await isValidGpx(gpx)).toBe(true);
  });

  it('validates even when the name contains XML-special characters', async () => {
    const gpx = buildGpxCourse(track, { name: 'Alps & <peaks> "2026"' });
    expect(await isValidGpx(gpx)).toBe(true);
  });
});

describe('buildGpxCourse — structure', () => {
  const gpx = buildGpxCourse(track, { name: 'Test' });
  const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(gpx);

  it('has a namespaced 1.1 root created by Pathfinder', () => {
    expect(doc.gpx['@_version']).toBe('1.1');
    expect(doc.gpx['@_xmlns']).toBe('http://www.topografix.com/GPX/1/1');
    expect(doc.gpx['@_creator']).toBe('Pathfinder');
  });

  it('omits <time> so COROS reads it as a navigable course', () => {
    expect(gpx).not.toContain('<time>');
  });

  it('round-trips the trackpoints with elevation preserved (no simplification)', () => {
    const full = buildGpxCourse(track, { name: 'Test', simplifyToleranceMeters: 0 });
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(
      full,
    );
    const pts = parsed.gpx.trk.trkseg.trkpt as Array<Record<string, string>>;
    expect(pts).toHaveLength(track.length);
    expect(Number(pts[0]!['@_lon'])).toBeCloseTo(11.5761, 4);
    expect(Number(pts[0]!['@_lat'])).toBeCloseTo(48.1374, 4);
    expect(Number(pts[0]!.ele)).toBeCloseTo(520, 0);
    expect(Number(pts[track.length - 1]!.ele)).toBeCloseTo(553, 0);
  });

  it('formats coordinates locale-independently (6 dp, dot separator)', () => {
    expect(gpx).toContain('lat="48.137400"');
    expect(gpx).toContain('lon="11.576100"');
  });
});

describe('simplifyTrack (Douglas-Peucker)', () => {
  it('reduces a near-straight line to its endpoints', () => {
    const line: GpxTrackPoint[] = Array.from({ length: 20 }, (_, i) => ({
      lng: 11 + i * 0.001,
      lat: 48 + i * 0.001,
    }));
    expect(simplifyTrack(line, 8).length).toBe(2);
  });

  it('keeps a vertex that deviates beyond the tolerance', () => {
    const zig: GpxTrackPoint[] = [
      { lng: 11.0, lat: 48.0 },
      { lng: 11.001, lat: 48.01 }, // a sharp detour north
      { lng: 11.002, lat: 48.0 },
    ];
    expect(simplifyTrack(zig, 8).length).toBe(3);
  });

  it('handles ≤2 points and duplicate points', () => {
    expect(simplifyTrack([{ lng: 0, lat: 0 }], 8)).toHaveLength(1);
    expect(
      simplifyTrack(
        [
          { lng: 0, lat: 0 },
          { lng: 0, lat: 0 },
          { lng: 0, lat: 0 },
        ],
        8,
      ).length,
    ).toBe(2);
  });
});

describe('gpx without elevation', () => {
  it('omits <ele> when a point has none and still validates', async () => {
    const gpx = buildGpxCourse([
      { lng: 11, lat: 48 },
      { lng: 11.01, lat: 48.01 },
    ]);
    expect(gpx).not.toContain('<ele>');
    expect(await isValidGpx(gpx)).toBe(true);
  });
});

describe('escapeXml', () => {
  it('escapes the five XML entities', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});
