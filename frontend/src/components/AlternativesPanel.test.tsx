// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlternativesPanel } from './AlternativesPanel';
import { useAppStore } from '../state/store';
import type { RouteAnalysis } from '../lib/route';

const initial = useAppStore.getState();

function route(movingSeconds: number, distanceMeters: number, ascentMeters: number): RouteAnalysis {
  return {
    points: [],
    distanceMeters,
    ascentMeters,
    descentMeters: 0,
    movingSeconds,
    difficultySegments: [],
  };
}

describe('AlternativesPanel', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('is hidden with fewer than two options', () => {
    useAppStore.setState({ alternatives: [route(100, 100, 100)] });
    const { container } = render(<AlternativesPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists labelled options and switches the selected route on click', async () => {
    useAppStore.setState({
      alternatives: [route(100, 100, 100), route(90, 120, 110)],
      route: route(100, 100, 100),
      selectedRouteIndex: 0,
    });
    render(<AlternativesPanel />);
    expect(screen.getByRole('button', { name: /recommended/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: /fastest/i }));
    expect(useAppStore.getState().selectedRouteIndex).toBe(1);
    expect(useAppStore.getState().route!.movingSeconds).toBe(90);
  });
});
