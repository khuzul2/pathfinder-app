import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capacitor plugin bridges are mocked: in Node/jsdom there is no native runtime, so we assert
// the wiring (write each file to the cache dir, then open the share sheet with those URIs).
const isNativeMock = vi.fn();
const writeFile = vi.fn();
const share = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativeMock() },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: (opts: unknown) => writeFile(opts) },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: (opts: unknown) => share(opts) },
}));

import { isNativePlatform, shareGpxNative } from './nativeShare';

const files = [
  { filename: 'pathfinder-route.gpx', contents: '<gpx>route</gpx>' },
  { filename: 'pathfinder-day-1.gpx', contents: '<gpx>day1</gpx>' },
];

describe('isNativePlatform', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to Capacitor.isNativePlatform', () => {
    isNativeMock.mockReturnValue(true);
    expect(isNativePlatform()).toBe(true);
    isNativeMock.mockReturnValue(false);
    expect(isNativePlatform()).toBe(false);
  });
});

describe('shareGpxNative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeFile.mockImplementation((opts: { path: string }) =>
      Promise.resolve({ uri: `file:///cache/${opts.path}` }),
    );
    share.mockResolvedValue(undefined);
  });

  it('writes each GPX to the cache dir as UTF-8', async () => {
    await shareGpxNative(files);
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile.mock.calls[0]![0]).toMatchObject({
      path: 'pathfinder-route.gpx',
      data: '<gpx>route</gpx>',
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(writeFile.mock.calls[1]![0]).toMatchObject({ path: 'pathfinder-day-1.gpx' });
  });

  it('opens the native share sheet with every written file URI', async () => {
    await shareGpxNative(files);
    expect(share).toHaveBeenCalledTimes(1);
    const opts = share.mock.calls[0]![0] as { files: string[]; title: string };
    expect(opts.files).toEqual([
      'file:///cache/pathfinder-route.gpx',
      'file:///cache/pathfinder-day-1.gpx',
    ]);
    expect(opts.title).toMatch(/pathfinder/i);
  });

  it('shares nothing when given no files', async () => {
    await shareGpxNative([]);
    expect(writeFile).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });
});
