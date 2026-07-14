import { useState } from 'react';
import { useAppStore } from '../state/store';
import { buildGpxFiles } from '../lib/gpxExport';
import { canShareGpx, downloadGpxFiles, shareGpx } from '../services/share';
import { isNativePlatform } from '../services/nativeShare';

/**
 * Export the route as GPX. The web always gets a reliable **Download GPX** (a direct file
 * download that works in every browser); the Capacitor Android build leads with **Export to
 * COROS** (the native share sheet). Sharing is best-effort — any failure falls back to a
 * download so the user never ends up with nothing (ADR-012).
 */
export function ExportButton() {
  const route = useAppStore((s) => s.route);
  const plan = useAppStore((s) => s.slicePlan);
  const [busy, setBusy] = useState(false);

  if (!route) return null;

  const files = () => buildGpxFiles(route, plan);
  const native = isNativePlatform();
  const webShare = !native && canShareGpx();

  const onDownload = () => downloadGpxFiles(files());

  const onShare = async () => {
    setBusy(true);
    try {
      await shareGpx(files());
    } catch (err) {
      if ((err as Error | undefined)?.name === 'AbortError') return; // user dismissed the sheet
      downloadGpxFiles(files()); // share failed → guarantee the file lands
    } finally {
      setBusy(false);
    }
  };

  const primary =
    'w-full rounded-lg bg-trail-green px-4 py-2 text-sm font-medium text-white shadow-fab disabled:opacity-60';
  const secondary =
    'w-full rounded-lg border border-trail-green px-4 py-2 text-sm font-medium text-trail-green disabled:opacity-60';

  return (
    <section aria-label="Export route" className="flex flex-col gap-2">
      {native ? (
        <>
          <button type="button" onClick={onShare} disabled={busy} className={primary}>
            {busy ? 'Exporting…' : 'Export to COROS'}
          </button>
          <button type="button" onClick={onDownload} className={secondary}>
            Download GPX
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={onDownload} className={primary}>
            Download GPX
          </button>
          {webShare && (
            <button type="button" onClick={onShare} disabled={busy} className={secondary}>
              {busy ? 'Sharing…' : 'Share to COROS'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
