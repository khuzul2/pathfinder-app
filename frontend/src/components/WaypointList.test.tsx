// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaypointList } from './WaypointList';
import { useAppStore } from '../state/store';

const initial = useAppStore.getState();

describe('WaypointList', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('shows the starting instruction when empty', () => {
    render(<WaypointList />);
    expect(screen.getByText(/click the map to drop points/i)).toBeInTheDocument();
  });

  it('lists waypoints and removes one on click', async () => {
    useAppStore.setState({
      waypoints: [
        { lng: 11.1, lat: 47.1 },
        { lng: 11.2, lat: 47.2 },
      ],
    });
    render(<WaypointList />);
    expect(screen.getByText(/waypoints \(2\)/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove waypoint 1/i }));
    expect(useAppStore.getState().waypoints).toHaveLength(1);
    expect(useAppStore.getState().waypoints[0]!.lng).toBeCloseTo(11.2, 5);
  });

  it('clears all waypoints', async () => {
    useAppStore.setState({ waypoints: [{ lng: 1, lat: 1 }] });
    render(<WaypointList />);
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(useAppStore.getState().waypoints).toHaveLength(0);
  });
});
