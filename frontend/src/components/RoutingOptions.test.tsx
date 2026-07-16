// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutingOptions } from './RoutingOptions';
import { useAppStore } from '../state/store';
import type { RouteAnalysis } from '../lib/route';

const initial = useAppStore.getState();

const route = {
  points: [{}, {}],
  distanceMeters: 0,
  ascentMeters: 0,
  descentMeters: 0,
  movingSeconds: 0,
} as unknown as RouteAnalysis;

describe('RoutingOptions', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('toggles the trail preference', async () => {
    render(<RoutingOptions />);
    const toggle = screen.getByRole('button', { name: /prefer trails/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true'); // avoid roads on by default
    await userEvent.click(toggle);
    expect(useAppStore.getState().routingOptions.avoidRoads).toBe(false);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('always shows the overnight stay-type chips', () => {
    render(<RoutingOptions />);
    expect(screen.getByRole('button', { name: /^bivvy$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^huts$/i })).toBeInTheDocument();
  });

  it('multi-selects overnight stay types', async () => {
    render(<RoutingOptions />);
    expect(useAppStore.getState().routingOptions.stayTypes.bivvy).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: /^bivvy$/i }));
    expect(useAppStore.getState().routingOptions.stayTypes.bivvy).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /^huts$/i }));
    expect(useAppStore.getState().routingOptions.stayTypes.hut).toBe(false);
  });

  it('disables the plan button until a route exists', () => {
    render(<RoutingOptions />);
    expect(screen.getByRole('button', { name: /plan overnight stays/i })).toBeDisabled();
  });

  it('plans overnight stays on demand when a route exists', async () => {
    useAppStore.setState({ route });
    render(<RoutingOptions />);
    expect(useAppStore.getState().overnightNonce).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: /plan overnight stays/i }));
    expect(useAppStore.getState().overnightNonce).toBe(1);
  });
});
