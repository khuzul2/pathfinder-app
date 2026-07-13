// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Attribution } from './Attribution';

describe('Attribution', () => {
  it('renders every required data-source credit', () => {
    render(<Attribution />);
    const text = screen.getByLabelText(/attribution/i).textContent ?? '';
    expect(text).toMatch(/OpenStreetMap/);
    expect(text).toMatch(/Mapbox/);
    expect(text).toMatch(/openrouteservice/);
    expect(text).toMatch(/RainViewer/);
  });
});
