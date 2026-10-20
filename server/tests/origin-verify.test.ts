import { describe, expect, it } from 'vitest';
import request from 'supertest';

// Each test file gets a fresh module graph, so the env var is read when the app is imported here.
process.env.ORIGIN_VERIFY_SECRET = 'cloudfront-shared-secret-123456';
const { createApp } = await import('../src/app');
const app = createApp();

describe('Origin verification (API behind CloudFront without a load balancer)', () => {
  it('rejects requests that did not come through CloudFront', async () => {
    const r = await request(app).get('/api/v1/sheet');
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a wrong secret', async () => {
    const r = await request(app)
      .get('/api/v1/sheet')
      .set('X-Origin-Verify', 'cloudfront-shared-secret-XXXXXX');
    expect(r.status).toBe(403);
  });

  it('lets CloudFront requests through', async () => {
    const r = await request(app)
      .get('/api/v1/health')
      .set('X-Origin-Verify', 'cloudfront-shared-secret-123456');
    expect(r.status).not.toBe(403);
  });
});
