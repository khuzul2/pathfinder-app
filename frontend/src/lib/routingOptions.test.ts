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
  it('avoids roads, auto-plans overnights, and offers hut/camp stays by default', () => {
    expect(DEFAULT_ROUTING_OPTIONS.avoidRoads).toBe(true);
    expect(DEFAULT_ROUTING_OPTIONS.autoOvernight).toBe(true);
    // Huts + campsites on by default; hotels/B&Bs are opt-in (dense in towns); bivvy off.
    expect(DEFAULT_ROUTING_OPTIONS.stayTypes).toEqual({
      hut: true,
      camp: true,
      hotel: false,
      guesthouse: false,
      bivvy: false,
    });
  });
});
