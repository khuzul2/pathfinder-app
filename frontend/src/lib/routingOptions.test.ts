import { describe, it, expect } from 'vitest';
import { orsProfile, DEFAULT_ROUTING_OPTIONS } from './routingOptions';

describe('orsProfile', () => {
  it('prefers trails (foot-hiking) when avoiding roads', () => {
    expect(orsProfile(true)).toBe('foot-hiking');
  });

  it('allows roads (foot-walking) when not avoiding them', () => {
    expect(orsProfile(false)).toBe('foot-walking');
  });
});

describe('DEFAULT_ROUTING_OPTIONS', () => {
  it('avoids roads by default and offers hut/camp stays', () => {
    expect(DEFAULT_ROUTING_OPTIONS.avoidRoads).toBe(true);
    expect(DEFAULT_ROUTING_OPTIONS.autoOvernight).toBe(false);
    expect(DEFAULT_ROUTING_OPTIONS.stayTypes).toEqual({ hut: true, camp: true, bivvy: false });
  });
});
