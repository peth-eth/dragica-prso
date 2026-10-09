# API Routes Guide

## Purpose

Route handlers for auth, AI, uploads, image proxying, newsletter operations, citizen suggestions, and council questions.

## Patterns

- Keep handlers small and validate request inputs before calling shared helpers.
- Use `lib/db.ts`, `lib/newsletter.ts`, `lib/resend.ts`, `lib/turso.ts`, and `lib/sanitize.ts` for core behavior.
- Return clear JSON errors with appropriate status codes.
- Keep admin-only actions behind authenticated checks.

## Gotchas

- Runtime secrets are provided by Cloudflare/Wrangler, not committed env files.
- R2 upload/proxy behavior depends on the `IMAGES` binding from `wrangler.toml`.
