import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { ChapterSeed } from '@dsa/shared';
import { createApp } from '../src/app';
import { seedContent } from '../src/seed/seed';
import { invalidateSheetCache } from '../src/modules/sheet/sheet.service';

export const app = createApp();
export const TZ = 'Asia/Kolkata';

const res = (n: string) => ({
  youtube: `https://www.youtube.com/watch?v=${n}`,
  practice: { platform: 'LeetCode' as const, url: `https://leetcode.com/problems/${n}/` },
  article: `https://example.com/${n}`,
});

export const fixture: ChapterSeed[] = [
  {
    title: 'Arrays',
    slug: 'arrays',
    order: 1,
    description: 'Arrays chapter',
    icon: 'brackets',
    topics: [
      {
        title: 'Basics',
        slug: 'basics',
        difficulty: 'Easy',
        description: '',
        resources: res('basics'),
        problems: [
          {
            title: 'Two Sum',
            slug: 'two-sum',
            difficulty: 'Easy',
            resources: res('two-sum'),
            tags: [],
          },
          {
            title: 'Move Zeroes',
            slug: 'move-zeroes',
            difficulty: 'Easy',
            resources: res('move-zeroes'),
            tags: [],
          },
        ],
      },
      {
        title: 'Prefix Sum',
        slug: 'prefix-sum',
        difficulty: 'Medium',
        description: '',
        resources: res('prefix'),
        problems: [
          {
            title: 'Subarray Sum Equals K',
            slug: 'subarray-sum-equals-k',
            difficulty: 'Medium',
            resources: res('ss'),
            tags: [],
          },
          {
            title: 'Trapping Rain Water',
            slug: 'trapping-rain-water',
            difficulty: 'Hard',
            resources: res('trw'),
            tags: [],
          },
        ],
      },
    ],
  },
];

/** Spins up an isolated in-memory MongoDB per test file and seeds the fixture sheet. */
export function useTestDb() {
  let mongo: MongoMemoryServer;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
    invalidateSheetCache();
    await seedContent(fixture);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });
}

let counter = 0;
/** Registers a fresh student and returns an agent (keeps the refresh cookie) + bearer token. */
export async function registerUser(name = 'Test Student') {
  const agent = request.agent(app);
  const email = `student${++counter}@test.dev`;
  const r = await agent.post('/api/v1/auth/register').send({ name, email, password: 'Passw0rd!' });
  if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
  const token: string = r.body.data.accessToken;
  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`).set('X-Timezone', TZ);
  return { agent, email, token, auth, user: r.body.data.user };
}

export async function getSheet() {
  const r = await request(app).get('/api/v1/sheet');
  return r.body.data as import('@dsa/shared').SheetDTO;
}

export const problemIds = async () =>
  (await getSheet()).chapters.flatMap((c) => c.topics.flatMap((t) => t.problems.map((p) => p.id)));
