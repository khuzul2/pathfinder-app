// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerControls } from './LayerControls';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

describe('LayerControls', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('toggles the trail overlay and rain radar', async () => {
    render(<LayerControls />);
    await userEvent.click(screen.getByRole('button', { name: /hiking trails overlay/i }));
    expect(useAppStore.getState().trailsOverlay).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /rain radar/i }));
    expect(useAppStore.getState().radarEnabled).toBe(true);
  });

  it('toggles a POI category filter', async () => {
    render(<LayerControls />);
    expect(useAppStore.getState().poiFilters.alpine_hut).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /mountain hut/i }));
    expect(useAppStore.getState().poiFilters.alpine_hut).toBe(false);
  });
});
