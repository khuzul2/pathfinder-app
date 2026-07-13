import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { useMockUpstreams } from './msw/setup';

useMockUpstreams();

describe('GET /api/pois', () => {
  it('returns POI elements for a valid bbox', async () => {
    const app = createApp();
    const res = await request(app).get('/api/pois?south=47.1&west=11.2&north=47.4&east=11.6');
    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(3);
  });

  it('rejects an inverted bbox with 400', async () => {
    const app = createApp();
    const res = await request(app).get('/api/pois?south=47.4&west=11.2&north=47.1&east=11.6');
    expect(res.status).toBe(400);
  });
});
