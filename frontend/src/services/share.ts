import type { GpxFile } from '../lib/gpxExport';
import { isNativePlatform, shareGpxNative } from './nativeShare';

/** Trigger a browser download of a single `.gpx` file. */
export function downloadGpxFile(file: GpxFile, doc: Document = document): void {
  const blob = new Blob([file.contents], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke later, not synchronously: some browsers cancel an in-flight download if the object
  // URL is revoked in the same tick as the click.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Download every GPX file (the combined route, plus any per-day courses). */
export function downloadGpxFiles(files: readonly GpxFile[], doc: Document = document): void {
  files.forEach((f) => downloadGpxFile(f, doc));
}

/** Native-share seam, injectable for tests (defaults to the real Capacitor bridge). */
export interface NativeShareAdapter {
  isNative: () => boolean;
  share: (files: readonly GpxFile[]) => Promise<void>;
}

const defaultNative: NativeShareAdapter = { isNative: isNativePlatform, share: shareGpxNative };

/**
 * Whether a "share" affordance can actually work here: the Capacitor native shell, or a browser
 * whose Web Share API accepts files. When false, callers should offer only a download. (Most
 * desktop browsers report false for file sharing — hence the always-available download.)
 */
export function canShareGpx(env: { nav?: Navigator; native?: NativeShareAdapter } = {}): boolean {
  const native = env.native ?? defaultNative;
  if (native.isNative()) return true;
  const nav = env.nav ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  if (!nav || typeof nav.canShare !== 'function' || typeof nav.share !== 'function') return false;
  try {
    const probe = new File(['<gpx/>'], 'route.gpx', { type: 'application/gpx+xml' });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Share the GPX to another app (COROS). Native (Capacitor) opens the Android share sheet; a
 * capable browser uses the Web Share API. **Throws** when sharing isn't possible or the share
 * fails/aborts, so the caller can fall back to a download — never leave the user with nothing
 * (that silent-failure was the old bug; ADR-012).
 */
export async function shareGpx(
  files: readonly GpxFile[],
  env: { nav?: Navigator; native?: NativeShareAdapter } = {},
): Promise<void> {
  const native = env.native ?? defaultNative;
  if (native.isNative()) {
    await native.share(files);
    return;
  }

  const nav = env.nav ?? navigator;
  const shareFiles = files.map(
    (f) => new File([f.contents], f.filename, { type: 'application/gpx+xml' }),
  );
  if (
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: shareFiles }) &&
    typeof nav.share === 'function'
  ) {
    await nav.share({ files: shareFiles, title: 'Pathfinder route' });
    return;
  }
  throw new Error('Web Share is unavailable for GPX files on this platform');
}
