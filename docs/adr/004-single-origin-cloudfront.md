# ADR-004: Serve web and API from one CloudFront origin

**Status:** Accepted · **Date:** 2026-10-20

## Context

Hosting the SPA (S3) and API (ALB) on different domains requires CORS, preflight requests on every non-simple call, and `SameSite=None` cookies, which are weaker and blocked by some browsers' third-party cookie rules.

## Decision

- A single CloudFront distribution routes `/*` to S3 (with a SPA rewrite function) and `/api/*` to the ALB.
- The ALB only accepts CloudFront's origin-facing IP ranges carrying a secret `X-Origin-Verify` header.
- Locally, the Vite dev proxy (and nginx in `docker-compose`) reproduce the same topology.

## Consequences

- ✅ First-party `SameSite=Strict` cookies, no CORS, no preflights, one TLS certificate.
- ✅ The public sheet endpoint is cached at the edge, close to students.
- ✅ The API cannot be reached by bypassing the CDN.
- ➖ API cache behaviour must be configured carefully: a custom cache policy with TTL 0 by default, `Authorization` included in the key, and `no-store` on private responses.
