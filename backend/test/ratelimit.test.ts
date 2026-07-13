import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { useMockUpstreams } from './msw/setup';

useMockUpstreams();

describe('per-IP rate limiting', () => {
  it('returns 429 after the per-minute limit is exceeded', async () => {
    const app = createApp({ rateLimitPerMin: 2 });
    const first = await request(app).get('/api/radar');
    const second = await request(app).get('/api/radar');
    const third = await request(app).get('/api/radar');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error).toBe('rate_limited');
  });
});
