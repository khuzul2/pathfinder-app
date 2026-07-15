import type { Bbox } from './poiApi';

/**
 * Has the map viewport drifted enough from the area layers were last fetched for that we should
 * offer a "Search this area" refresh? True when the current view's centre has panned outside the
 * fetched box, or the view has zoomed in/out enough that the fetched box is a poor fit. This drives
 * the manual-refresh button (Google-Maps style) instead of refetching on every pan/zoom.
 */
export function isSearchStale(fetched: Bbox, current: Bbox): boolean {
  const centreLng = (current.west + current.east) / 2;
  const centreLat = (current.south + current.north) / 2;
  const panned =
    centreLng < fetched.west ||
    centreLng > fetched.east ||
    centreLat < fetched.south ||
    centreLat > fetched.north;
  if (panned) return true;

  const fetchedSpan = fetched.east - fetched.west;
  if (fetchedSpan <= 0) return true;
  const ratio = (current.east - current.west) / fetchedSpan;
  return ratio > 1.5 || ratio < 0.6;
}
