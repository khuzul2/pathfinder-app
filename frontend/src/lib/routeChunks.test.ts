import { describe, it, expect } from 'vitest';
import { chunkWaypoints } from './routeChunks';

describe('chunkWaypoints', () => {
  it('returns a single chunk when within the limit', () => {
    expect(chunkWaypoints([1, 2, 3], 48)).toEqual([[1, 2, 3]]);
  });

  it('splits into overlapping chunks that share a seam vertex and cover everything', () => {
    const pts = Array.from({ length: 100 }, (_, i) => i);
    const chunks = chunkWaypoints(pts, 48);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(48));
    // Consecutive chunks overlap by exactly one vertex.
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]![0]).toBe(chunks[i - 1]![chunks[i - 1]!.length - 1]);
    }
    // First and last vertices are covered.
    expect(chunks[0]![0]).toBe(0);
    expect(chunks[chunks.length - 1]!.at(-1)).toBe(99);
  });

  it('drops a degenerate (<2 point) input', () => {
    expect(chunkWaypoints([1], 48)).toEqual([]);
    expect(chunkWaypoints([], 48)).toEqual([]);
  });
});
