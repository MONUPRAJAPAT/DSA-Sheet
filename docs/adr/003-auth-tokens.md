# ADR-003: Short-lived JWT access token + rotating httpOnly refresh cookie

**Status:** Accepted · **Date:** 2026-10-20

## Context

We need secure login that scales horizontally, supports logout and revocation, and is resistant to XSS and CSRF.

## Options

| Option                                                         | Problem                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| JWT in `localStorage`                                          | Readable by any injected script (XSS = account takeover); can't be revoked |
| Server sessions only                                           | Needs a shared session store (Redis) and a DB/cache hit on every request   |
| **Access JWT in memory + refresh token in an httpOnly cookie** | —                                                                          |

## Decision

- The access JWT lasts 15 minutes. It is held in memory and sent as a Bearer header, and verified statelessly.
- The refresh token is 384 random bits:
  - it lives in an `httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie;
  - it is stored server-side only as a SHA-256 hash, in `sessions`, with a TTL index;
  - it is **rotated on every use**.
- The client refreshes silently on a 401, single-flighted so parallel requests trigger only one refresh.

## Consequences

- ✅ No auth DB hit on normal requests, so any API instance can serve any user.
- ✅ Logout and "log out everywhere" take effect immediately; a leaked DB contains no usable tokens.
- ✅ CSRF can't use the cookie (strict same-site, auth-path only, and data endpoints need the header).
- ➖ An access token remains valid for up to 15 minutes after revocation. Accepted for this domain.
