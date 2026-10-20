declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      user?: { id: string; role: 'student' | 'admin' };
      /** IANA timezone of the client, from the `X-Timezone` header (defaults to UTC). */
      timeZone: string;
      /** Parsed + validated query string (Express 5 makes `req.query` read-only). */
      validatedQuery?: unknown;
    }
  }
}
export {};
