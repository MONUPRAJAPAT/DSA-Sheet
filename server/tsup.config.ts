import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/seed/seed.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the workspace package (shipped as TS source); keep npm deps external.
  noExternal: ['@dsa/shared'],
  // Seed content ships next to the compiled seed script.
  onSuccess: 'mkdir -p dist/seed && cp -R src/seed/data dist/seed/',
});
