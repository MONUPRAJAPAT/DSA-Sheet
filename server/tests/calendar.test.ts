import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { addDays, toDateKey, weekday } from '../src/lib/dates';
import { CalendarEventModel } from '../src/models';
import { app, problemIds, registerUser, TZ, useTestDb } from './helpers';

useTestDb();
const today = () => toDateKey(new Date(), TZ);

describe('Calendar', () => {
  it('creates, lists, updates and deletes events', async () => {
    const [p1] = await problemIds();
    const { auth } = await registerUser();
    const created = await auth(
      request(app)
        .post('/api/v1/calendar/events')
        .send({ problemId: p1, date: today(), startTime: '19:00', endTime: '20:00' }),
    );
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      title: 'Two Sum',
      type: 'study',
      status: 'pending',
      problem: { id: p1, difficulty: 'Easy' },
    });

    const id = created.body.data.id;
    const list = await auth(
      request(app).get(
        `/api/v1/calendar/events?from=${addDays(today(), -1)}&to=${addDays(today(), 1)}`,
      ),
    );
    expect(list.body.data).toHaveLength(1);

    const moved = await auth(
      request(app)
        .patch(`/api/v1/calendar/events/${id}`)
        .send({ date: addDays(today(), 3) }),
    );
    expect(moved.body.data.date).toBe(addDays(today(), 3));
    expect((await auth(request(app).delete(`/api/v1/calendar/events/${id}`))).status).toBe(200);
    expect((await auth(request(app).delete(`/api/v1/calendar/events/${id}`))).status).toBe(404);
  });

  it("does not expose another student's events", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const e = await a.auth(
      request(app).post('/api/v1/calendar/events').send({ title: 'Mock', date: today() }),
    );
    expect(
      (
        await b.auth(
          request(app).patch(`/api/v1/calendar/events/${e.body.data.id}`).send({ title: 'x' }),
        )
      ).status,
    ).toBe(404);
  });

  it('validates date ranges', async () => {
    const { auth } = await registerUser();
    expect(
      (await auth(request(app).get('/api/v1/calendar/events?from=2026-02-01&to=2026-01-01')))
        .status,
    ).toBe(400);
    expect(
      (await auth(request(app).get('/api/v1/calendar/events?from=bad&to=2026-01-01'))).status,
    ).toBe(400);
  });

  it('completing a study task ticks the problem on the sheet', async () => {
    const [p1] = await problemIds();
    const { auth } = await registerUser();
    const e = await auth(
      request(app).post('/api/v1/calendar/events').send({ problemId: p1, date: today() }),
    );
    await auth(
      request(app).patch(`/api/v1/calendar/events/${e.body.data.id}`).send({ status: 'done' }),
    );
    const progress = (await auth(request(app).get('/api/v1/progress'))).body.data;
    expect(progress[0]).toMatchObject({ problemId: p1, status: 'solved' });
  });

  it('generates an auto study plan on the chosen study days only', async () => {
    const { auth, user } = await registerUser();
    const start = today();
    const r = await auth(
      request(app)
        .post('/api/v1/calendar/plan')
        .send({
          startDate: start,
          targetDate: addDays(start, 13),
          dailyGoal: 1,
          studyDays: [1, 3, 5],
        }),
    );
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ created: 4, unscheduled: 0, fitsBeforeTarget: true });
    const events = await CalendarEventModel.find({ userId: user.id, source: 'auto-plan' }).lean();
    expect(events.every((e) => [1, 3, 5].includes(weekday(e.date)))).toBe(true);
    expect(new Set(events.map((e) => e.date)).size).toBe(4); // one per day

    // Regenerating replaces the previous auto plan instead of duplicating it.
    await auth(
      request(app)
        .post('/api/v1/calendar/plan')
        .send({
          startDate: start,
          targetDate: addDays(start, 13),
          dailyGoal: 2,
          studyDays: [1, 3, 5],
        }),
    );
    expect(await CalendarEventModel.countDocuments({ userId: user.id, source: 'auto-plan' })).toBe(
      4,
    );
  });

  it('reports when the plan does not fit and suggests a daily goal', async () => {
    const { auth } = await registerUser();
    const start = today();
    const r = await auth(
      request(app)
        .post('/api/v1/calendar/plan')
        .send({
          startDate: start,
          targetDate: start,
          dailyGoal: 1,
          studyDays: [0, 1, 2, 3, 4, 5, 6],
        }),
    );
    expect(r.body.data).toMatchObject({
      created: 1,
      unscheduled: 3,
      fitsBeforeTarget: false,
      suggestedDailyGoal: 4,
    });
  });

  it('rolls overdue tasks over to today and keeps history as missed', async () => {
    const { auth, user } = await registerUser();
    await auth(
      request(app)
        .post('/api/v1/calendar/events')
        .send({ title: 'Old task', date: addDays(today(), -3) }),
    );
    const agenda = (await auth(request(app).get('/api/v1/calendar/agenda'))).body.data;
    expect(agenda.overdue).toHaveLength(1);
    const r = await auth(request(app).post('/api/v1/calendar/rollover'));
    expect(r.body.data.moved).toBe(1);
    const events = await CalendarEventModel.find({ userId: user.id }).sort({ date: 1 }).lean();
    expect(events.map((e) => [e.status, e.date === today(), e.rolledOverFrom])).toEqual([
      ['missed', false, null],
      ['pending', true, addDays(today(), -3)],
    ]);
  });

  it('exports an iCalendar file', async () => {
    const { auth } = await registerUser();
    await auth(
      request(app)
        .post('/api/v1/calendar/events')
        .send({ title: 'Graphs, revision; C:\\path', date: '2026-03-04' }),
    );
    const r = await auth(request(app).get('/api/v1/calendar/export.ics'));
    expect(r.headers['content-type']).toMatch(/text\/calendar/);
    expect(r.text).toContain('BEGIN:VCALENDAR');
    expect(r.text).toContain('DTSTART;VALUE=DATE:20260304');
    expect(r.text).toContain('SUMMARY:Graphs\\, revision\\; C:\\\\path');
  });
});

describe('Health', () => {
  it('reports DB connectivity', async () => {
    const r = await request(app).get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});
