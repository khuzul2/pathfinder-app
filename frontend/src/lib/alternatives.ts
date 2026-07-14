import type { RouteAnalysis } from './route';

export interface RouteAlternative {
  route: RouteAnalysis;
  /** Short badge: "Recommended", or the superlative this option wins, else "Alternative N". */
  label: string;
}

/**
 * Characterize a set of route options so the choice is meaningful. ORS returns its recommended
 * route first; that one is always "Recommended". Every other option earns the superlative it
 * actually wins across the set (Fastest / Shortest / Least climbing) — so it only claims to be
 * faster when it genuinely is — falling back to a generic "Alternative N".
 */
export function labelAlternatives(routes: readonly RouteAnalysis[]): RouteAlternative[] {
  if (routes.length === 0) return [];

  const argMin = (sel: (r: RouteAnalysis) => number): number =>
    routes.reduce((best, r, i) => (sel(r) < sel(routes[best] as RouteAnalysis) ? i : best), 0);

  const fastest = argMin((r) => r.movingSeconds);
  const shortest = argMin((r) => r.distanceMeters);
  const flattest = argMin((r) => r.ascentMeters);

  let altCount = 0;
  return routes.map((route, i) => {
    if (i === 0) return { route, label: 'Recommended' };
    let label: string;
    if (i === fastest) label = 'Fastest';
    else if (i === shortest) label = 'Shortest';
    else if (i === flattest) label = 'Least climbing';
    else label = `Alternative ${++altCount}`;
    return { route, label };
  });
}
