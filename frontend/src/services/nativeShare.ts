import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { GpxFile } from '../lib/gpxExport';

/** True only inside the Capacitor native shell (Android/iOS); false in any browser. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Native export path (Capacitor Android): the Web Share API rejects `.gpx`, so instead we
 * write each course to the app's cache directory and hand the resulting `file://` URIs to the
 * platform share sheet. The user picks the COROS app to receive them (ADR-008a). Verified
 * on-device — see docs/MANUAL_QA.md.
 */
export async function shareGpxNative(files: readonly GpxFile[]): Promise<void> {
  if (files.length === 0) return;

  const uris: string[] = [];
  for (const file of files) {
    const { uri } = await Filesystem.writeFile({
      path: file.filename,
      data: file.contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    uris.push(uri);
  }

  await Share.share({
    title: 'Pathfinder route',
    text: 'Hiking route from Pathfinder — open in COROS.',
    files: uris,
  });
}
