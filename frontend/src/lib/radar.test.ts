import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseRadarFrames,
  latestPastFrame,
  buildRadarTileUrl,
  RADAR_COLOR_SCHEME,
  RADAR_MAX_ZOOM,
} from './radar';
import { RainViewerMapsSchema } from '../contracts/rainviewer';

const maps = RainViewerMapsSchema.parse(
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'test/fixtures/rainviewer-weather-maps.json'), 'utf-8'),
  ),
);

describe('parseRadarFrames', () => {
  it('concatenates past + nowcast frames', () => {
    const frames = parseRadarFrames(maps);
    expect(frames).toHaveLength(4); // 2 past + 2 nowcast in the fixture
    expect(frames[0]!.path).toContain('/v2/radar/');
  });

  it('handles a missing nowcast array', () => {
    const frames = parseRadarFrames({ host: maps.host, radar: { past: maps.radar.past } });
    expect(frames).toHaveLength(2);
  });
});

describe('latestPastFrame', () => {
  it('returns the most recent observed frame', () => {
    const frame = latestPastFrame(maps);
    expect(frame).not.toBeNull();
    expect(frame!.time).toBe(1751362800);
  });

  it('returns null when there are no past frames', () => {
    expect(latestPastFrame({ host: maps.host, radar: { past: [] } })).toBeNull();
  });
});

describe('buildRadarTileUrl', () => {
  it('builds from host + path with Mapbox {z}/{x}/{y} placeholders and free-tier defaults', () => {
    const frame = latestPastFrame(maps)!;
    const url = buildRadarTileUrl(maps.host, frame.path);
    expect(url).toBe(
      `https://tilecache.rainviewer.com/v2/radar/1751362800/256/{z}/{x}/{y}/${RADAR_COLOR_SCHEME}/1_1.png`,
    );
  });

  it('never hardcodes the host (uses whatever weather-maps.json returned)', () => {
    const url = buildRadarTileUrl('https://example.test', '/v2/radar/abc');
    expect(url.startsWith('https://example.test/v2/radar/abc/')).toBe(true);
  });

  it('respects overridden color/size options', () => {
    const url = buildRadarTileUrl('h', '/p', { size: 512, color: 4, smooth: 0, snow: 0 });
    expect(url).toBe('h/p/512/{z}/{x}/{y}/4/0_0.png');
  });
});

describe('free-tier constants', () => {
  it('caps zoom at 7 and uses the only free color scheme (2)', () => {
    expect(RADAR_MAX_ZOOM).toBe(7);
    expect(RADAR_COLOR_SCHEME).toBe(2);
  });
});
