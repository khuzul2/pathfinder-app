import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { http, HttpResponse } from 'msw';
import { createApp } from '../src/app';
import { useMockUpstreams } from './msw/setup';
import { server } from './msw/server';
import { captured, OPENWEATHER_URL } from './msw/handlers';

useMockUpstreams();

describe('GET /api/weather', () => {
  it('injects the appid, keeps minutely + alerts, and does not leak the key', async () => {
    const app = createApp({ openweatherApiKey: 'test-ow-key' });
    const res = await request(app).get('/api/weather?lat=48.1374&lon=11.5761');
    expect(res.status).toBe(200);
    expect(captured.weatherAppid).toBe('test-ow-key');
    expect(Array.isArray(res.body.minutely)).toBe(true);
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('test-ow-key');
  });

  it('rejects out-of-range coordinates with 400', async () => {
    const app = createApp({ openweatherApiKey: 'test-ow-key' });
    const res = await request(app).get('/api/weather?lat=999&lon=11');
    expect(res.status).toBe(400);
  });

  it('returns 503 when the OpenWeather key is not configured', async () => {
    const app = createApp({ openweatherApiKey: '' });
    const res = await request(app).get('/api/weather?lat=48.1&lon=11.5');
    expect(res.status).toBe(503);
  });

  it('caches repeat requests for the same rounded coordinate (one upstream hit)', async () => {
    let hits = 0;
    server.use(
      http.get(OPENWEATHER_URL, () => {
        hits += 1;
        return HttpResponse.json({ lat: 48.1, lon: 11.5, minutely: [], alerts: [] });
      }),
    );
    const app = createApp({ openweatherApiKey: 'test-ow-key' });
    await request(app).get('/api/weather?lat=48.137&lon=11.576');
    await request(app).get('/api/weather?lat=48.137&lon=11.576');
    expect(hits).toBe(1);
  });
});
