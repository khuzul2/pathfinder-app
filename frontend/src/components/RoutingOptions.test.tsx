// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutingOptions } from './RoutingOptions';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

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

  it('shows stay-type chips only while auto overnight is on', async () => {
    render(<RoutingOptions />);
    // auto overnight defaults on → chips visible
    expect(screen.getByRole('button', { name: /^bivvy$/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /auto overnight stays/i }));
    expect(useAppStore.getState().routingOptions.autoOvernight).toBe(false);
    expect(screen.queryByRole('button', { name: /^bivvy$/i })).not.toBeInTheDocument();
  });

  it('multi-selects overnight stay types', async () => {
    render(<RoutingOptions />);
    expect(useAppStore.getState().routingOptions.stayTypes.bivvy).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: /^bivvy$/i }));
    expect(useAppStore.getState().routingOptions.stayTypes.bivvy).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /^huts$/i }));
    expect(useAppStore.getState().routingOptions.stayTypes.hut).toBe(false);
  });
});
