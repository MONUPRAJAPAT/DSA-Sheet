// Runs before any test module is imported, so env.ts sees a valid test configuration.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://placeholder/overridden-by-memory-server';
process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
process.env.LOG_LEVEL = 'silent';
