import { describe, it, expect } from 'vitest';
import { buildDifficultySegments, difficultyLevel, SAC_DIFFICULTY } from './difficulty';
import type { OrsExtraTriple } from './surfaceFactor';

const coords: Array<[number, number, number]> = [
  [11.0, 47.0, 800],
  [11.001, 47.001, 820],
  [11.002, 47.002, 850],
  [11.003, 47.003, 900],
  [11.004, 47.004, 950],
];

describe('difficultyLevel', () => {
  it('maps SAC codes to labelled colors and falls back to unknown', () => {
    expect(difficultyLevel(1).short).toBe('T1');
    expect(difficultyLevel(6).short).toBe('T6');
    expect(difficultyLevel(99)).toEqual(SAC_DIFFICULTY[0]);
  });
});

describe('buildDifficultySegments', () => {
  it('splits coordinates by traildifficulty triples, sharing boundary vertices', () => {
    const triples: OrsExtraTriple[] = [
      [0, 2, 1],
      [2, 4, 3],
    ];
    const segments = buildDifficultySegments(coords, triples);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.sac).toBe(1);
    expect(segments[0]!.coordinates).toHaveLength(3); // vertices 0,1,2
    expect(segments[1]!.sac).toBe(3);
    expect(segments[1]!.coordinates[0]).toEqual([11.002, 47.002]); // shared boundary vertex
    expect(segments[0]!.color).toBe(SAC_DIFFICULTY[1]!.color);
  });

  it('returns a single unknown-grade segment when no difficulty info exists', () => {
    const segments = buildDifficultySegments(coords);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.sac).toBe(0);
    expect(segments[0]!.coordinates).toHaveLength(coords.length);
  });
});
