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
});
