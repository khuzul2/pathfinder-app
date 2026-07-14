import { useState } from 'react';
import { useAppStore } from '../state/store';
import { buildGpxFiles } from '../lib/gpxExport';
import { downloadGpxFiles } from '../services/share';
import type { SavedRoute } from '../lib/savedRoute';

/** A single saved-route row: click to open; rename inline; delete; download GPX. */
function RouteRow({ route, active }: { route: SavedRoute; active: boolean }) {
  const openRoute = useAppStore((s) => s.openRoute);
  const renameRoute = useAppStore((s) => s.renameRoute);
  const deleteRoute = useAppStore((s) => s.deleteRoute);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(route.name);

  const commitRename = () => {
    renameRoute(route.id, draft);
    setRenaming(false);
  };

  const download = () => {
    if (route.route) downloadGpxFiles(buildGpxFiles(route.route));
    else openRoute(route.id); // no cached analysis yet — open it so it recomputes
  };

  if (renaming) {
    return (
      <li className="flex items-center gap-1 px-2 py-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          aria-label={`Rename route ${route.name}`}
          className="w-full rounded border border-trail-green bg-white px-2 py-1 text-sm text-slate-accent outline-none dark:bg-neutral-900 dark:text-neutral-100"
        />
        <button type="button" onClick={commitRename} className="px-1 text-sm text-trail-green">
          ✓
        </button>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm ${
        active ? 'bg-trail-green/15' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
      }`}
    >
      <button
        type="button"
        onClick={() => openRoute(route.id)}
        aria-label={`Open route ${route.name}`}
        className="flex-1 truncate text-left"
        title={route.name}
      >
        {route.name}
      </button>
      <div className="flex items-center gap-0.5 text-neutral-400 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraft(route.name);
            setRenaming(true);
          }}
          aria-label={`Rename route ${route.name}`}
          className="px-1 hover:text-slate-accent dark:hover:text-neutral-100"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={download}
          aria-label={`Download route ${route.name}`}
          className="px-1 hover:text-slate-accent dark:hover:text-neutral-100"
        >
          ⭳
        </button>
        <button
          type="button"
          onClick={() => deleteRoute(route.id)}
          aria-label={`Delete route ${route.name}`}
          className="px-1 hover:text-hazard-coral"
        >
          🗑
        </button>
      </div>
    </li>
  );
}

/** "All routes": start a fresh route, and revisit any autosaved route. */
export function RoutesPanel() {
  const savedRoutes = useAppStore((s) => s.savedRoutes);
  const currentRouteId = useAppStore((s) => s.currentRouteId);
  const newRoute = useAppStore((s) => s.newRoute);

  const ordered = [...savedRoutes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <section aria-label="Routes" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={newRoute}
        className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-slate-accent hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-700"
      >
        <span aria-hidden="true" className="text-trail-green">
          ＋
        </span>
        New route
      </button>

      <span className="mt-2 px-1 text-[11px] uppercase tracking-wide opacity-60">My routes</span>
      {ordered.length === 0 ? (
        <p className="px-1 py-1 text-xs opacity-60">
          No saved routes yet — start planning and it autosaves here.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {ordered.map((r) => (
            <RouteRow key={r.id} route={r} active={r.id === currentRouteId} />
          ))}
        </ul>
      )}
    </section>
  );
}
