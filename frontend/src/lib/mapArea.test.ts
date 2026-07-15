import { describe, it, expect } from 'vitest';
import { isSearchStale } from './mapArea';
import type { Bbox } from './poiApi';

const fetched: Bbox = { south: 46.0, west: 11.0, north: 46.4, east: 11.6 };

describe('isSearchStale', () => {
  it('is fresh for a small pan within the fetched box', () => {
    const current: Bbox = { south: 46.05, west: 11.05, north: 46.35, east: 11.55 };
    expect(isSearchStale(fetched, current)).toBe(false);
  });

  it('is stale after panning the centre outside the fetched box', () => {
    const current: Bbox = { south: 46.0, west: 12.0, north: 46.4, east: 12.6 };
    expect(isSearchStale(fetched, current)).toBe(true);
  });

  it('is stale after zooming out a lot (much wider view)', () => {
    const current: Bbox = { south: 45.0, west: 10.0, north: 47.4, east: 12.6 }; // ~4x wider
    expect(isSearchStale(fetched, current)).toBe(true);
  });

  it('is stale after zooming in a lot (much narrower view)', () => {
    const current: Bbox = { south: 46.19, west: 11.29, north: 46.21, east: 11.31 };
    expect(isSearchStale(fetched, current)).toBe(true);
  });
});
