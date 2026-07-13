// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadarToggle } from './RadarToggle';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

describe('RadarToggle', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('reflects and toggles radar state via aria-pressed', async () => {
    render(<RadarToggle />);
    const btn = screen.getByRole('button', { name: /radar/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(useAppStore.getState().radarEnabled).toBe(true);
  });
});
