// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DaySlicer } from './DaySlicer';
import { useAppStore } from '../state/store';
import type { RouteAnalysis } from '../lib/route';
import type { SlicePlan } from '../lib/slicing';

const initial = useAppStore.getState();

const route = {
  points: [{}, {}],
  distanceMeters: 0,
  ascentMeters: 0,
  descentMeters: 0,
  movingSeconds: 0,
} as unknown as RouteAnalysis;

const twoDayPlan: SlicePlan = {
  days: [
    {
      index: 0,
      startIndex: 0,
      endIndex: 6,
      movingSeconds: 21600,
      distanceMeters: 12000,
      shelterAtEnd: { id: 'h', lng: 0, lat: 0, kind: 'alpine_hut', name: 'Pfeishütte' },
    },
    {
      index: 1,
      startIndex: 6,
      endIndex: 9,
      movingSeconds: 10800,
      distanceMeters: 6000,
      shelterAtEnd: null,
    },
  ],
  warnings: [],
};

describe('DaySlicer', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders nothing without a route', () => {
    const { container } = render(<DaySlicer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each day with its time, distance, and shelter', () => {
    useAppStore.setState({ route, slicePlan: twoDayPlan });
    render(<DaySlicer />);
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 2')).toBeInTheDocument();
    expect(screen.getByText('Pfeishütte')).toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  it('changes the target hours via the control', async () => {
    useAppStore.setState({ route, slicePlan: twoDayPlan });
    render(<DaySlicer />);
    await userEvent.click(screen.getByRole('button', { name: '8h' }));
    expect(useAppStore.getState().targetHours).toBe(8);
  });
});
