// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

describe('ThemeToggle', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('cycles system → light → dark on click', async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /theme/i });
    expect(useAppStore.getState().themePref).toBe('system');

    await userEvent.click(btn);
    expect(useAppStore.getState().themePref).toBe('light');

    await userEvent.click(btn);
    expect(useAppStore.getState().themePref).toBe('dark');
  });
});
