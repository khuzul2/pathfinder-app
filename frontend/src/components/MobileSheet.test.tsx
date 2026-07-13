// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileSheet } from './MobileSheet';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

describe('MobileSheet', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('always offers the swipe-up planner trigger', () => {
    render(<MobileSheet />);
    expect(screen.getByRole('button', { name: /plan route/i })).toBeInTheDocument();
  });

  it('reveals the planning workspace when opened', async () => {
    render(<MobileSheet />);
    await userEvent.click(screen.getByRole('button', { name: /plan route/i }));
    expect(await screen.findByText(/click the map to drop points/i)).toBeInTheDocument();
  });
});
