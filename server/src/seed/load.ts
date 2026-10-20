import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapterSeedSchema, type ChapterSeed } from '@dsa/shared';

export const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** Reads and Zod-validates every chapter file. A malformed file fails loudly before anything is written. */
export function loadChapterFiles(dir = DATA_DIR): ChapterSeed[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (!files.length) throw new Error(`No chapter files found in ${dir}`);
  return files.map((f) => {
    const result = chapterSeedSchema.safeParse(
      JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
    );
    if (!result.success)
      throw new Error(`${f} is invalid:\n${JSON.stringify(result.error.issues, null, 2)}`);
    return result.data;
  });
}
