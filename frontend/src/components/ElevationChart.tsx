import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../state/store';

/**
 * Elevation profile (ele vs. cumulative distance). Hovering sets `hoverIndex` in the store,
 * which MapCanvas uses to place a locator dot on the trail (map ↔ chart hover-sync).
 */
export function ElevationChart() {
  const route = useAppStore((s) => s.route);
  const setHoverIndex = useAppStore((s) => s.setHoverIndex);

  if (!route || route.points.length < 2) return null;

  const data = route.points.map((p, i) => ({
    i,
    distance: Math.round(p.distanceMeters),
    ele: Math.round(p.ele),
  }));

  return (
    <div className="h-28 w-full rounded-lg bg-white/95 p-1 shadow-fab dark:bg-neutral-800/95">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
          onMouseMove={(state) => {
            const idx = (state as { activeTooltipIndex?: number }).activeTooltipIndex;
            setHoverIndex(typeof idx === 'number' ? idx : null);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <XAxis dataKey="distance" hide />
          <YAxis dataKey="ele" hide domain={['dataMin - 10', 'dataMax + 10']} />
          <Tooltip
            formatter={(value) => [`${value} m`, 'Elevation']}
            labelFormatter={(label) => `${label} m`}
          />
          <Line
            type="monotone"
            dataKey="ele"
            stroke="#0F9D58"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
