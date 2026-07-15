import { useAppStore } from '../state/store';
import { POI_KINDS, POI_META } from '../lib/poiApi';

function Toggle({
  label,
  pressed,
  onClick,
  swatch,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors ${
        pressed
          ? 'bg-trail-green/15 text-slate-accent dark:text-neutral-100'
          : 'text-slate-accent/50 dark:text-neutral-400'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border ${
          pressed ? 'border-trail-green bg-trail-green text-white' : 'border-neutral-400'
        }`}
      >
        {pressed ? '✓' : ''}
      </span>
      {swatch && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: swatch }} />}
      {label}
    </button>
  );
}

/** Layer visibility: trail overlay, rain radar, and per-category POIs. */
export function LayerControls() {
  const trailsOverlay = useAppStore((s) => s.trailsOverlay);
  const toggleTrailsOverlay = useAppStore((s) => s.toggleTrailsOverlay);
  const communityHikesEnabled = useAppStore((s) => s.communityHikesEnabled);
  const toggleCommunityHikes = useAppStore((s) => s.toggleCommunityHikes);
  const radarEnabled = useAppStore((s) => s.radarEnabled);
  const toggleRadar = useAppStore((s) => s.toggleRadar);
  const poiFilters = useAppStore((s) => s.poiFilters);
  const togglePoiFilter = useAppStore((s) => s.togglePoiFilter);

  return (
    <section aria-label="Map layers" className="flex flex-col gap-0.5">
      <span className="mb-1 text-[11px] uppercase tracking-wide opacity-60">Layers</span>
      <Toggle
        label="Hiking trails (marked paths)"
        pressed={trailsOverlay}
        onClick={toggleTrailsOverlay}
      />
      <Toggle
        label="Community hikes"
        swatch="#8E24AA"
        pressed={communityHikesEnabled}
        onClick={toggleCommunityHikes}
      />
      <Toggle label="Rain radar" pressed={radarEnabled} onClick={toggleRadar} />
      {POI_KINDS.map((kind) => (
        <Toggle
          key={kind}
          label={POI_META[kind].label}
          swatch={POI_META[kind].color}
          pressed={poiFilters[kind]}
          onClick={() => togglePoiFilter(kind)}
        />
      ))}
    </section>
  );
}
