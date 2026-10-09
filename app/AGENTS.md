# App Directory Guide

## Purpose

Next.js App Router surface for the public website, protected admin UI, and route handlers.

## Patterns

- Keep route-level composition in `page.tsx` and `layout.tsx`.
- `public/images/favicon.png` is the browser favicon generated from the public hero portrait.
- `public/images/social-share.png` is the 1200x630 Open Graph image for shared links.
- Put reusable UI under `app/components/`.
- Keep API route handlers thin and delegate shared logic to `lib/`.
- Preserve `/admin` as the protected admin entry point.

## Gotchas

- Server route handlers run in the Cloudflare/OpenNext target, so avoid Node-only APIs unless already supported by the deployment setup.
- Auth behavior depends on `app/api/auth/[...nextauth]/route.ts` plus `lib/auth.ts`.
