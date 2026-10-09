# Dragica Pršo Project Guide

## Purpose

This repo contains Dragica Pršo's public website and newsletter/admin system. The current app is Next.js 15 deployed through OpenNext for Cloudflare Workers.

## Key Files

- `app/page.tsx`: public homepage entry.
- `app/components/PublicSite.tsx`: main public website UI.
- `app/admin/page.tsx`: protected newsletter/admin workspace.
- `app/components/newsletter-builder.tsx`: AI-assisted newsletter editor and sender flow.
- `app/api/`: API routes for auth, AI, questions, suggestions, newsletter, images, and uploads.
- `middleware.ts`: redirects `www` and the legacy Workers host to the canonical production domain before auth cookies are created.
- `lib/`: shared auth, database, newsletter, Resend, Turso, sanitization, and Turnstile helpers.
- `drizzle/schema.ts`: persistent data model.
- `wrangler.toml`: Cloudflare Workers and R2 binding configuration.
- `public/images/`: public campaign imagery.

## Patterns

- Keep public-site UI in `app/components/PublicSite.tsx` and admin workflow UI in `app/components/newsletter-builder.tsx`.
- Use typed helpers from `lib/` instead of duplicating API/client logic inside routes.
- Keep admin-only behavior behind Google auth and `ADMIN_EMAILS`.
- Treat `dragicaprso.hr` as the production domain; keep `NEXTAUTH_URL` and DNS/deployment settings aligned with it.
- Use Cloudflare runtime secrets for production values; do not commit real credentials.

## Gotchas

- `dragicaprso.hr` uses Cloudflare nameservers and is attached to this Worker as a custom domain.
- R2 image behavior depends on both the `IMAGES` binding and `R2_PUBLIC_URL`.
- Newsletter sending depends on Resend audience/from settings and Turso being reachable.
