import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { useMockUpstreams } from './msw/setup';

useMockUpstreams();

describe('GET /api/radar', () => {
  it('returns the RainViewer frame index', async () => {
    const app = createApp();
    const res = await request(app).get('/api/radar');
    expect(res.status).toBe(200);
    expect(res.body.host).toContain('rainviewer');
    expect(Array.isArray(res.body.radar.past)).toBe(true);
  });
});
