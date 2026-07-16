// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText(/Pfeishütte/)).toBeInTheDocument();
    expect(screen.getByText(/Finish/)).toBeInTheDocument();
  });

  it('adjusts the desired hours/day range via the sliders', () => {
    useAppStore.setState({ route, slicePlan: twoDayPlan });
    render(<DaySlicer />);
    const min = screen.getByRole('slider', { name: /minimum hours per day/i });
    fireEvent.change(min, { target: { value: '3' } });
    expect(useAppStore.getState().hoursRange.min).toBe(3);
    const max = screen.getByRole('slider', { name: /maximum hours per day/i });
    fireEvent.change(max, { target: { value: '12' } });
    expect(useAppStore.getState().hoursRange.max).toBe(12);
  });

  it('flags a day that falls outside the desired range', () => {
    useAppStore.setState({
      route,
      slicePlan: {
        days: [
          { ...twoDayPlan.days[0]!, movingSeconds: 12 * 3600, outsideRange: true },
          twoDayPlan.days[1]!,
        ],
        warnings: [],
      },
      hoursRange: { min: 4, max: 8 },
    });
    render(<DaySlicer />);
    expect(screen.getByText(/Longer than your 4–8h range/i)).toBeInTheDocument();
  });
});
