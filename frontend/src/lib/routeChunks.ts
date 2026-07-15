/**
 * Split a long list of routing points into overlapping chunks of at most `maxPerChunk`, so a trail
 * with more vertices than the router's per-request coordinate limit can be routed in pieces and
 * stitched back together. Consecutive chunks share one vertex (the seam) so the routed segments
 * join without a gap.
 */
export function chunkWaypoints<T>(points: readonly T[], maxPerChunk: number): T[][] {
  if (maxPerChunk < 2) throw new Error('maxPerChunk must be >= 2');
  if (points.length <= maxPerChunk) return points.length >= 2 ? [[...points]] : [];

  const chunks: T[][] = [];
  const step = maxPerChunk - 1; // overlap one vertex between consecutive chunks
  for (let start = 0; start < points.length - 1; start += step) {
    chunks.push(points.slice(start, start + maxPerChunk));
  }
  return chunks;
}
