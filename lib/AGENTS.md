# Lib Directory Guide

## Purpose

Shared server-side helpers for authentication, database access, newsletter generation/sending, sanitization, Turso, Resend, and Turnstile.

## Patterns

- Keep external service clients centralized here.
- `resend-audience.ts` selects the configured Resend audience, with a guarded recovery path only when exactly one alternative audience has active contacts.
- Use explicit TypeScript types and narrow `unknown` values at boundaries.
- Keep API route handlers as orchestration layers over these helpers.
- Do not commit credentials or fallback production secrets.
- Keep Cloudflare-bound runtime configuration inside request-time helpers, not `process.env` module initialization.
- Keep hostname-routing decisions in small pure helpers so they can be regression-tested.

## Gotchas

- Cloudflare Workers compatibility matters. Avoid Node-only libraries unless they are already proven in the build.
- Email delivery depends on both Resend env vars and a valid audience/from configuration.
