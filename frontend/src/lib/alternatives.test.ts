import { describe, it, expect } from 'vitest';
import { labelAlternatives } from './alternatives';
import type { RouteAnalysis } from './route';

function r(movingSeconds: number, distanceMeters: number, ascentMeters: number): RouteAnalysis {
  return {
    points: [],
    distanceMeters,
    ascentMeters,
    descentMeters: 0,
    movingSeconds,
    difficultySegments: [],
  };
}

describe('labelAlternatives', () => {
  it('labels the first as Recommended and gives others their winning superlative', () => {
    const labelled = labelAlternatives([
      r(100, 100, 100), // recommended
      r(90, 120, 110), // fastest
      r(110, 90, 90), // shortest AND flattest → first match wins (Shortest)
    ]);
    expect(labelled.map((l) => l.label)).toEqual(['Recommended', 'Fastest', 'Shortest']);
  });

  it('assigns "Least climbing" when that is the only superlative an option holds', () => {
    const labelled = labelAlternatives([
      r(100, 100, 100), // recommended (also fastest + shortest)
      r(120, 130, 80), // only flattest
    ]);
    expect(labelled[1]!.label).toBe('Least climbing');
  });

  it('falls back to numbered alternatives when an option wins nothing', () => {
    const labelled = labelAlternatives([
      r(100, 100, 100), // recommended wins everything
      r(130, 130, 130),
      r(140, 140, 140),
    ]);
    expect(labelled.map((l) => l.label)).toEqual(['Recommended', 'Alternative 1', 'Alternative 2']);
  });

  it('handles a single route and an empty set', () => {
    expect(labelAlternatives([r(1, 1, 1)]).map((l) => l.label)).toEqual(['Recommended']);
    expect(labelAlternatives([])).toEqual([]);
  });
});
