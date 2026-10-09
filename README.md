# Dragica Pršo

Public website and newsletter admin for Dragica Pršo.

## What This Is

This is a Next.js 15 app prepared for Cloudflare Workers through OpenNext. It includes:

- the public Dragica Pršo website
- citizen questions and suggestions
- newsletter signup
- Google-protected admin at `/admin`
- AI-assisted newsletter drafting
- image upload/proxy support through R2
- Turso/Drizzle-backed persistence

## Domain

Production target:

```text
https://dragicaprso.hr/
```

The domain is registered through Plus Hosting and uses:

```text
ns1.mojsite.com
ns2.mojsite.com
```

DNS must point to the active Cloudflare/GitHub deployment before the domain resolves.

## Run Locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill the required values for local API, auth, AI, mail, database, and R2 behavior.

## Build And Deploy

```bash
pnpm build
pnpm build:cf
pnpm deploy:cf
```

Cloudflare deployment uses `wrangler.toml`.

Runtime secrets are set with `wrangler secret put <KEY>`:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
RESEND_API_KEY
RESEND_AUDIENCE_ID
RESEND_FROM
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
ADMIN_EMAILS
GEMINI_API_KEY
GEMINI_MODEL
R2_PUBLIC_URL
TURNSTILE_SECRET_KEY
```

## Admin Login

Admin lives at:

```text
/admin
```

Google login is allowlisted through `ADMIN_EMAILS`. Configure the admin addresses privately in the deployment environment.
