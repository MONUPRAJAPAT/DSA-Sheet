# ADR-001: TypeScript monorepo with a shared contract package

**Status:** Accepted · **Date:** 2026-10-20

## Context

The client and server must agree on request shapes, validation rules (password policy, date formats) and response types. In separate repos these drift, and bugs surface only at runtime.

## Decision

- One repository with npm workspaces: `shared/`, `server/`, `client/`.
- `shared` exports **Zod schemas, constants and DTO types**:
  - the server validates every request with these schemas;
  - the client uses the same schemas for form validation and the inferred types for API calls;
  - the OpenAPI docs are generated from them.
- TypeScript runs in `strict` mode with `noUncheckedIndexedAccess` everywhere.

## Consequences

- ✅ A breaking API change fails `npm run typecheck` in CI before it can ship.
- ✅ One PR can change the API, UI and docs together.
- ➖ The build has to bundle `shared` into the server (`tsup noExternal`); this is handled in the build config.
