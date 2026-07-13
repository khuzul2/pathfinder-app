// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ElevationCard } from './ElevationCard';
import { useAppStore } from '../state/store';
import type { RouteAnalysis } from '../lib/route';

const initial = useAppStore.getState();

const sampleRoute: RouteAnalysis = {
  points: [
    { lng: 11, lat: 48, ele: 500, distanceMeters: 0, timeSeconds: 0 },
    { lng: 11.01, lat: 48.01, ele: 620, distanceMeters: 2500, timeSeconds: 3720 },
  ],
  distanceMeters: 2500,
  ascentMeters: 120,
  descentMeters: 0,
  movingSeconds: 3720,
};

describe('ElevationCard', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders nothing without a route', () => {
    const { container } = render(<ElevationCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows distance, ascent, and Tobler time for a route', () => {
    useAppStore.setState({ route: sampleRoute });
    render(<ElevationCard />);
    expect(screen.getByLabelText(/route summary/i)).toBeInTheDocument();
    expect(screen.getByText('2.5 km')).toBeInTheDocument();
    expect(screen.getByText('↑ 120 m')).toBeInTheDocument();
    expect(screen.getByText('1h 2m')).toBeInTheDocument();
  });

  it('renders an alert when routing failed', () => {
    useAppStore.setState({ routeError: 'upstream down' });
    render(<ElevationCard />);
    expect(screen.getByRole('alert')).toHaveTextContent(/upstream down/i);
  });
});
