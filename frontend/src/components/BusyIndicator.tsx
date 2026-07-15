import { useAppStore } from '../state/store';

/**
 * Prominent, map-centred status pill for long-running actions: an explicit `busy` message (importing
 * a trail, rebuilding a long route) takes precedence, otherwise the in-flight route request shows
 * "Routing…". Keeps the user informed while a big route computes instead of leaving the UI silent.
 */
export function BusyIndicator() {
  const busy = useAppStore((s) => s.busy);
  const routing = useAppStore((s) => s.routing);
  const message = busy ?? (routing ? 'Routing…' : null);
  if (!message) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <span
        role="status"
        className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-accent shadow-fab dark:bg-neutral-800/95 dark:text-neutral-100"
      >
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-trail-green border-t-transparent"
          aria-hidden="true"
        />
        {message}
      </span>
    </div>
  );
}
