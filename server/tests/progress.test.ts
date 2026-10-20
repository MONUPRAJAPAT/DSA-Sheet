import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { CalendarEventModel, UserProgressModel } from '../src/models';
import { computeStreak } from '../src/modules/progress/progress.service';
import { app, getSheet, problemIds, registerUser, useTestDb } from './helpers';

useTestDb();

describe('Sheet', () => {
  it('is public, hierarchical (chapter → topic → problem) and ETag-cacheable', async () => {
    const r = await request(app).get('/api/v1/sheet');
    expect(r.status).toBe(200);
    const sheet = r.body.data;
    expect(sheet.chapters).toHaveLength(1);
    expect(sheet.chapters[0].topics.map((t: { title: string }) => t.title)).toEqual([
      'Basics',
      'Prefix Sum',
    ]);
    expect(sheet.chapters[0].topics[1]).toMatchObject({
      difficulty: 'Medium',
      resources: { practice: { platform: 'LeetCode' } },
    });
    expect(sheet.totals).toEqual({ problems: 4, easy: 2, medium: 1, hard: 1 });
    const again = await request(app).get('/api/v1/sheet').set('If-None-Match', r.headers.etag!);
    expect(again.status).toBe(304);
  });
});

describe('Progress tracking', () => {
  it('persists a ticked checkbox and returns it on the next session', async () => {
    const [p1] = await problemIds();
    const { auth, email } = await registerUser();
    const put = await auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'solved' }));
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ problemId: p1, status: 'solved' });
    expect(put.body.data.solvedAt).toEqual(expect.any(String));

    // "Next login": a brand-new session sees the same progress.
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' });
    const token = login.body.data.accessToken;
    const list = await request(app).get('/api/v1/progress').set('Authorization', `Bearer ${token}`);
    expect(list.body.data).toEqual([expect.objectContaining({ problemId: p1, status: 'solved' })]);
  });

  it('is an idempotent upsert — repeating the request never creates duplicates', async () => {
    const [p1] = await problemIds();
    const { auth, user } = await registerUser();
    for (let i = 0; i < 3; i++)
      await auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'solved' }));
    expect(await UserProgressModel.countDocuments({ userId: user.id })).toBe(1);
    expect(await CalendarEventModel.countDocuments({ userId: user.id, type: 'revision' })).toBe(4);
  });

  it('schedules spaced-repetition revisions on solve and removes them on un-tick', async () => {
    const [p1] = await problemIds();
    const { auth, user } = await registerUser();
    await auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'solved' }));
    const revisions = await CalendarEventModel.find({ userId: user.id, type: 'revision' })
      .sort({ date: 1 })
      .lean();
    expect(revisions.map((r) => r.revisionStage)).toEqual([1, 2, 3, 4]);
    await auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'todo' }));
    expect(
      await CalendarEventModel.countDocuments({
        userId: user.id,
        type: 'revision',
        status: 'pending',
      }),
    ).toBe(0);
  });

  it('stores stars and notes without changing solve state', async () => {
    const [, p2] = await problemIds();
    const { auth } = await registerUser();
    const r = await auth(
      request(app).put(`/api/v1/progress/${p2}`).send({ starred: true, notes: 'two pointers!' }),
    );
    expect(r.body.data).toMatchObject({
      starred: true,
      notes: 'two pointers!',
      status: 'todo',
      solvedAt: null,
    });
  });

  it('keeps progress private to each student', async () => {
    const [p1] = await problemIds();
    const a = await registerUser('Student A');
    const b = await registerUser('Student B');
    await a.auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'solved' }));
    expect((await b.auth(request(app).get('/api/v1/progress'))).body.data).toEqual([]);
  });

  it('rejects unknown and malformed problem ids', async () => {
    const { auth } = await registerUser();
    expect(
      (await auth(request(app).put('/api/v1/progress/not-an-id').send({ status: 'solved' })))
        .status,
    ).toBe(400);
    expect(
      (
        await auth(
          request(app).put('/api/v1/progress/64b7f0000000000000000000').send({ status: 'solved' }),
        )
      ).status,
    ).toBe(404);
  });

  it('resumes where the student left off', async () => {
    const [p1, p2, p3] = await problemIds();
    const { auth } = await registerUser();
    let stats = (await auth(request(app).get('/api/v1/progress/stats'))).body.data;
    expect(stats.continue.problemId).toBe(p1); // brand-new student starts at the first problem

    await auth(request(app).post('/api/v1/progress/last-active').send({ problemId: p3 }));
    stats = (await auth(request(app).get('/api/v1/progress/stats'))).body.data;
    expect(stats.continue.problemId).toBe(p3);

    await auth(request(app).put(`/api/v1/progress/${p1}`).send({ status: 'solved' }));
    stats = (await auth(request(app).get('/api/v1/progress/stats'))).body.data;
    expect(stats.continue.problemId).toBe(p2); // last touched is solved → next unsolved after it
    expect(stats).toMatchObject({
      solved: 1,
      total: 4,
      byDifficulty: { Easy: { solved: 1, total: 2 } },
    });
    expect(stats.streak.current).toBe(1);
  });

  it('resets all progress', async () => {
    const ids = await problemIds();
    const { auth } = await registerUser();
    for (const id of ids)
      await auth(request(app).put(`/api/v1/progress/${id}`).send({ status: 'solved' }));
    await auth(request(app).delete('/api/v1/progress'));
    expect((await auth(request(app).get('/api/v1/progress'))).body.data).toEqual([]);
    expect((await getSheet()).totals.problems).toBe(4);
  });
});

describe('computeStreak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    expect(computeStreak([], '2026-01-10')).toEqual({ current: 0, longest: 0 });
    expect(computeStreak(['2026-01-08', '2026-01-09', '2026-01-10'], '2026-01-10')).toEqual({
      current: 3,
      longest: 3,
    });
    expect(computeStreak(['2026-01-08', '2026-01-09'], '2026-01-10')).toEqual({
      current: 2,
      longest: 2,
    });
    expect(
      computeStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-07'], '2026-01-10'),
    ).toEqual({ current: 0, longest: 3 });
  });
});
