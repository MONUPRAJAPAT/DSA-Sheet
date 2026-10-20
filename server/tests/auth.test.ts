import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, registerUser, useTestDb } from './helpers';

useTestDb();

describe('Auth', () => {
  it('registers a student, returns an access token and sets an httpOnly refresh cookie', async () => {
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'Passw0rd!' });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.data.user).toMatchObject({
      name: 'Asha',
      email: 'asha@example.com',
      role: 'student',
    });
    expect(r.body.data.user.passwordHash).toBeUndefined();
    expect(r.body.data.accessToken).toEqual(expect.any(String));
    const cookie = String(r.headers['set-cookie']);
    expect(cookie).toMatch(/dsa_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('rejects duplicate emails with 409', async () => {
    const { email } = await registerUser();
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email, password: 'Passw0rd!' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CONFLICT');
  });

  it('validates input and lists every issue', async () => {
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'nope', password: 'short' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(r.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['body.name', 'body.email', 'body.password']),
    );
  });

  it('logs in with correct credentials and rejects wrong ones with a generic message', async () => {
    const { email } = await registerUser();
    const bad = await request(app).post('/api/v1/auth/login').send({ email, password: 'Wrong123' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Incorrect email or password');
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@x.dev', password: 'Wrong123' });
    expect(unknown.body.error.message).toBe(bad.body.error.message);
    const good = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' });
    expect(good.status).toBe(200);
  });

  it('protects private routes', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer garbage')).status,
    ).toBe(401);
    const { auth } = await registerUser('Ravi');
    const me = await auth(request(app).get('/api/v1/auth/me'));
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe('Ravi');
  });

  it('rotates the refresh token: the previous token cannot be reused', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Rotate', email: 'rotate@test.dev', password: 'Passw0rd!' });
    const original = String(reg.headers['set-cookie']).match(/dsa_rt=[^;]+/)![0];

    const first = await request(app).post('/api/v1/auth/refresh').set('Cookie', original);
    expect(first.status).toBe(200);
    const rotated = String(first.headers['set-cookie']).match(/dsa_rt=[^;]+/)![0];
    expect(rotated).not.toBe(original);

    // Replaying the consumed token fails and clears the cookie; the new one still works.
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', original);
    expect(replay.status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', rotated)).status).toBe(
      200,
    );
  });

  it('demo login explains clearly when the demo account has not been seeded', async () => {
    const r = await request(app).post('/api/v1/auth/demo');
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('DEMO_UNAVAILABLE');
  });

  it('demo login signs in to the seeded demo student', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Demo Student', email: 'demo@dsasheet.dev', password: 'Demo@1234' });
    const r = await request(app).post('/api/v1/auth/demo');
    expect(r.status).toBe(200);
    expect(r.body.data.user.email).toBe('demo@dsasheet.dev');
    expect(String(r.headers['set-cookie'])).toMatch(/dsa_rt=/);
  });

  it('logout revokes the session', async () => {
    const { agent } = await registerUser();
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
  });
});
