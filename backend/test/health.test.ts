import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// Proves the backend test path (supertest, in-process, no open port, no live upstream)
// works from day 0. The loop extends this file family with the real /api contract tests.
describe('gateway skeleton', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(createApp()).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/route responds 501 until Phase 1 implements it', async () => {
    const res = await request(createApp()).post('/api/route').send({});
    expect(res.status).toBe(501);
  });

  it('GET /api/weather responds 501 until Phase 1 implements it', async () => {
    const res = await request(createApp()).get('/api/weather');
    expect(res.status).toBe(501);
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await request(createApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
