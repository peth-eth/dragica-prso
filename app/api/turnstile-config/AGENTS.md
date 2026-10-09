# Turnstile Config Route Guide

## Purpose

Exposes the public Cloudflare Turnstile site key to the browser at runtime.

## Key File

- `route.ts`: reads `TURNSTILE_SITE_KEY` from the Worker binding and returns it with no caching.

## Patterns

- Treat the site key as public configuration; never return the Turnstile secret.
- Read Worker bindings through `getCloudflareContext`.
- Keep the response small and non-cacheable so key changes take effect immediately.

## Gotchas

- The site key and secret must belong to the same Turnstile widget.
- Hostnames allowed in the Turnstile dashboard must include the deployed site domain.
