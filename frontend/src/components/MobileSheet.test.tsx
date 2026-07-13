// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileSheet } from './MobileSheet';
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

describe('MobileSheet', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders nothing without a route', () => {
    const { container } = render(<MobileSheet />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a swipe-up trigger once a route exists', () => {
    useAppStore.setState({ route });
    render(<MobileSheet />);
    expect(screen.getByRole('button', { name: /route details/i })).toBeInTheDocument();
  });
});
