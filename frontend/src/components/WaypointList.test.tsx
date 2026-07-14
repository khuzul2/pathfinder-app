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
    expect(screen.getByText(/click the map to add stops/i)).toBeInTheDocument();
  });

  it('labels start/end and lists named stops', () => {
    useAppStore.setState({
      waypoints: [
        { lng: 11.1, lat: 47.1, name: 'Munich' },
        { lng: 11.2, lat: 47.2 },
        { lng: 11.3, lat: 47.3, name: 'Innsbruck' },
      ],
    });
    render(<WaypointList />);
    expect(screen.getByText(/stops \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByText('Munich')).toBeInTheDocument();
    expect(screen.getByText('Innsbruck')).toBeInTheDocument();
  });

  it('removes a stop on click', async () => {
    useAppStore.setState({
      waypoints: [
        { lng: 11.1, lat: 47.1 },
        { lng: 11.2, lat: 47.2 },
      ],
    });
    render(<WaypointList />);
    await userEvent.click(screen.getByRole('button', { name: /remove stop 1/i }));
    expect(useAppStore.getState().waypoints).toHaveLength(1);
    expect(useAppStore.getState().waypoints[0]!.lng).toBeCloseTo(11.2, 5);
  });

  it('reorders a stop down', async () => {
    useAppStore.setState({
      waypoints: [
        { lng: 1, lat: 1, name: 'A' },
        { lng: 2, lat: 2, name: 'B' },
      ],
    });
    render(<WaypointList />);
    await userEvent.click(screen.getByRole('button', { name: /move stop 1 down/i }));
    expect(useAppStore.getState().waypoints.map((w) => w.name)).toEqual(['B', 'A']);
  });

  it('reverses the route direction', async () => {
    useAppStore.setState({
      waypoints: [
        { lng: 1, lat: 1, name: 'A' },
        { lng: 2, lat: 2, name: 'B' },
        { lng: 3, lat: 3, name: 'C' },
      ],
    });
    render(<WaypointList />);
    await userEvent.click(screen.getByRole('button', { name: /reverse route/i }));
    expect(useAppStore.getState().waypoints.map((w) => w.name)).toEqual(['C', 'B', 'A']);
  });

  it('clears all stops', async () => {
    useAppStore.setState({ waypoints: [{ lng: 1, lat: 1 }] });
    render(<WaypointList />);
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(useAppStore.getState().waypoints).toHaveLength(0);
  });
});
