// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadGpxFile, shareOrDownloadGpx } from './share';

const file = { filename: 'route.gpx', contents: '<?xml version="1.0"?><gpx></gpx>' };

describe('downloadGpxFile', () => {
  let createSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.fn(() => 'blob:mock');
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createSpy;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('creates an object URL and clicks a download anchor', () => {
    downloadGpxFile(file);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0]![0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe('shareOrDownloadGpx', () => {
  // Force the web path in these cases (Capacitor is not native under jsdom, but be explicit).
  const web = { isNative: () => false, share: vi.fn(() => Promise.resolve()) };

  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('prefers the Capacitor native share sheet when on a native platform', async () => {
    const share = vi.fn((_files: readonly (typeof file)[]) => Promise.resolve());
    const native = { isNative: () => true, share };
    const result = await shareOrDownloadGpx([file], { native });
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0]![0]).toEqual([file]);
  });

  it('uses the Web Share API when the platform can share the files', async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = { canShare: vi.fn(() => true), share } as unknown as Navigator;
    const result = await shareOrDownloadGpx([file], { nav, native: web });
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('falls back to downloading when file sharing is unavailable', async () => {
    const nav = {} as Navigator; // no canShare → web download path
    const result = await shareOrDownloadGpx([file], { nav, native: web });
    expect(result).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});
