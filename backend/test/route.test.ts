import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { http, HttpResponse, delay } from 'msw';
import { createApp } from '../src/app';
import { useMockUpstreams } from './msw/setup';
import { server } from './msw/server';
import { captured, ORS_URL } from './msw/handlers';

useMockUpstreams();

const validBody = {
  coordinates: [
    [11.5761, 48.1374],
    [11.582, 48.1402],
  ],
};

describe('POST /api/route', () => {
  it('injects the ORS key upstream and never leaks it to the client', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app).post('/api/route').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(captured.orsAuth).toBe('test-ors-key');
    expect(JSON.stringify(res.body)).not.toContain('test-ors-key');
  });

  it('defaults to the foot-hiking profile', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    await request(app).post('/api/route').send(validBody);
    expect(captured.orsProfile).toBe('foot-hiking');
  });

  it('forwards a selected foot-walking profile upstream', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app)
      .post('/api/route')
      .send({ ...validBody, profile: 'foot-walking' });
    expect(res.status).toBe(200);
    expect(captured.orsProfile).toBe('foot-walking');
  });

  it('rejects an unknown profile with 400 (SSRF allowlist)', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app)
      .post('/api/route')
      .send({ ...validBody, profile: 'driving-car' });
    expect(res.status).toBe(400);
  });

  it('requests ORS alternatives for a two-waypoint route', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    await request(app)
      .post('/api/route')
      .send({ ...validBody, alternatives: true });
    expect(captured.orsAlternatives).toBe(true);
  });

  it('omits alternatives for more than two waypoints', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    await request(app)
      .post('/api/route')
      .send({
        coordinates: [
          [11.5, 48.1],
          [11.6, 48.2],
          [11.7, 48.3],
        ],
        alternatives: true,
      });
    expect(captured.orsAlternatives).toBe(false);
  });

  it('rejects out-of-range coordinates with 400', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app)
      .post('/api/route')
      .send({ coordinates: [[200, 100]] });
    expect(res.status).toBe(400);
  });

  it('rejects an oversized body with 413', async () => {
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const huge = { coordinates: Array.from({ length: 5000 }, () => [11.5, 48.1]) };
    const res = await request(app).post('/api/route').send(huge);
    expect(res.status).toBe(413);
  });

  it('returns 503 when the ORS key is not configured', async () => {
    const app = createApp({ orsApiKey: '' });
    const res = await request(app).post('/api/route').send(validBody);
    expect(res.status).toBe(503);
  });

  it('passes an upstream 429 through with Retry-After', async () => {
    server.use(
      http.post(
        ORS_URL,
        () =>
          new HttpResponse(JSON.stringify({ error: 'rate' }), {
            status: 429,
            headers: { 'retry-after': '30' },
          }),
      ),
    );
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app).post('/api/route').send(validBody);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('30');
  });

  it('maps an upstream 500 to 502', async () => {
    server.use(http.post(ORS_URL, () => new HttpResponse(null, { status: 500 })));
    const app = createApp({ orsApiKey: 'test-ors-key' });
    const res = await request(app).post('/api/route').send(validBody);
    expect(res.status).toBe(502);
  });

  it('maps an upstream timeout to 504', async () => {
    server.use(
      http.post(ORS_URL, async () => {
        await delay(300);
        return HttpResponse.json({});
      }),
    );
    const app = createApp({ orsApiKey: 'test-ors-key', upstreamTimeoutMs: 40 });
    const res = await request(app).post('/api/route').send(validBody);
    expect(res.status).toBe(504);
  });
});
