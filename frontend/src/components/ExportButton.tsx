import { useState } from 'react';
import { useAppStore } from '../state/store';
import { buildGpxFiles } from '../lib/gpxExport';
import { shareOrDownloadGpx } from '../services/share';

/** "Export to COROS" — shares the GPX natively where possible, else downloads it. */
export function ExportButton() {
  const route = useAppStore((s) => s.route);
  const plan = useAppStore((s) => s.slicePlan);
  const [busy, setBusy] = useState(false);

  if (!route) return null;

  const onExport = async () => {
    setBusy(true);
    try {
      await shareOrDownloadGpx(buildGpxFiles(route, plan));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={busy}
      className="w-full rounded-lg bg-trail-green px-4 py-2 text-sm font-medium text-white shadow-fab disabled:opacity-60"
    >
      {busy ? 'Exporting…' : 'Export to COROS'}
    </button>
  );
}
