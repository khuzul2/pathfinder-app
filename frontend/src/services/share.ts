import type { GpxFile } from '../lib/gpxExport';

/** Trigger a browser download of a single `.gpx` file. */
export function downloadGpxFile(file: GpxFile, doc: Document = document): void {
  const blob = new Blob([file.contents], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  doc.body.appendChild(anchor);
  anchor.click();
  doc.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type ExportResult = 'shared' | 'downloaded';

/**
 * Send the route to another app (COROS). Uses the Web Share API when the platform reports it
 * can share the files, otherwise downloads each `.gpx`. On the web, browsers reject `.gpx`
 * from Web Share (`canShare` → false) so this downloads; the Capacitor Android build supplies
 * a native share that DOES accept the file (ADR-008a; see docs/MANUAL_QA.md).
 */
export async function shareOrDownloadGpx(
  files: readonly GpxFile[],
  env: { nav?: Navigator; doc?: Document } = {},
): Promise<ExportResult> {
  const nav = env.nav ?? navigator;
  const doc = env.doc ?? document;
  const shareFiles = files.map(
    (f) => new File([f.contents], f.filename, { type: 'application/gpx+xml' }),
  );

  if (
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: shareFiles }) &&
    typeof nav.share === 'function'
  ) {
    await nav.share({ files: shareFiles, title: 'Pathfinder route' });
    return 'shared';
  }

  files.forEach((f) => downloadGpxFile(f, doc));
  return 'downloaded';
}
