// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadGpxFile, downloadGpxFiles, canShareGpx, shareGpx } from './share';

const file = { filename: 'route.gpx', contents: '<?xml version="1.0"?><gpx></gpx>' };
const web = { isNative: () => false, share: vi.fn(() => Promise.resolve()) };

describe('downloadGpxFile / downloadGpxFiles', () => {
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

  it('downloads every file in the set', () => {
    downloadGpxFiles([file, { filename: 'day-1.gpx', contents: '<gpx/>' }]);
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });
});

describe('canShareGpx', () => {
  it('is true on a native platform', () => {
    expect(canShareGpx({ native: { isNative: () => true, share: web.share } })).toBe(true);
  });

  it('is true when the browser can share files', () => {
    const nav = { canShare: () => true, share: vi.fn() } as unknown as Navigator;
    expect(canShareGpx({ nav, native: web })).toBe(true);
  });

  it('is false when the browser cannot share files', () => {
    const nav = { canShare: () => false, share: vi.fn() } as unknown as Navigator;
    expect(canShareGpx({ nav, native: web })).toBe(false);
  });

  it('is false without any Web Share API', () => {
    expect(canShareGpx({ nav: {} as Navigator, native: web })).toBe(false);
  });
});

describe('shareGpx', () => {
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('prefers the Capacitor native share sheet on a native platform', async () => {
    const share = vi.fn((_files: readonly (typeof file)[]) => Promise.resolve());
    await shareGpx([file], { native: { isNative: () => true, share } });
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0]![0]).toEqual([file]);
  });

  it('uses the Web Share API when the browser can share the files', async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = { canShare: vi.fn(() => true), share } as unknown as Navigator;
    await shareGpx([file], { nav, native: web });
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('throws when sharing is unavailable, so the caller can download instead', async () => {
    await expect(shareGpx([file], { nav: {} as Navigator, native: web })).rejects.toThrow();
  });

  it('propagates a share rejection (e.g. the user aborts the sheet)', async () => {
    const err = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const nav = {
      canShare: () => true,
      share: vi.fn(() => Promise.reject(err)),
    } as unknown as Navigator;
    await expect(shareGpx([file], { nav, native: web })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
