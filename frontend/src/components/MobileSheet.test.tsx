// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileSheet } from './MobileSheet';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MobileSheet />
    </QueryClientProvider>,
  );
}

describe('MobileSheet', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('always offers the swipe-up planner trigger', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /plan route/i })).toBeInTheDocument();
  });

  it('reveals the planning workspace when opened', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /plan route/i }));
    expect(await screen.findByText(/click the map to add stops/i)).toBeInTheDocument();
  });
});
