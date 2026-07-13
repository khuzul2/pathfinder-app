// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { useAppStore } from './state/store';

const initial = useAppStore.getState();

// Smoke test of the whole shell. MapCanvas skips real Mapbox init here (no token, no WebGL),
// so the shell renders cleanly in jsdom.
describe('App shell', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders the heading, controls, map container, and attribution', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /pathfinder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /radar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    expect(screen.getByLabelText(/attribution/i)).toBeInTheDocument();
  });
});
