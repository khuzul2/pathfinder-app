// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from './ExportButton';
import { useAppStore } from '../state/store';
import type { RouteAnalysis } from '../lib/route';

const initial = useAppStore.getState();

const route: RouteAnalysis = {
  points: [
    { lng: 11.4, lat: 47.25, ele: 900, distanceMeters: 0, timeSeconds: 0 },
    { lng: 11.41, lat: 47.26, ele: 980, distanceMeters: 1200, timeSeconds: 1000 },
    { lng: 11.42, lat: 47.27, ele: 1040, distanceMeters: 2400, timeSeconds: 2000 },
  ],
  distanceMeters: 2400,
  ascentMeters: 140,
  descentMeters: 0,
  movingSeconds: 2000,
  difficultySegments: [],
};

describe('ExportButton', () => {
  let downloadName = '';
  beforeEach(() => {
    useAppStore.setState(initial, true);
    downloadName = '';
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('is hidden until a route exists', () => {
    const { container } = render(<ExportButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('downloads a valid GPX blob when the download button is clicked (web)', async () => {
    useAppStore.setState({ route });
    render(<ExportButton />);
    // On the web (jsdom has no Web Share API) the reliable download is the primary action.
    await userEvent.click(screen.getByRole('button', { name: /download gpx/i }));

    const createObjectURL = URL.createObjectURL as unknown as ReturnType<typeof vi.fn>;
    expect(createObjectURL).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/gpx+xml');
    expect(blob.size).toBeGreaterThan(0);
    expect(downloadName).toBe('pathfinder-route.gpx');
  });
});
