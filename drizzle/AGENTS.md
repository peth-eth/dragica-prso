# Drizzle Directory Guide

## Purpose

Database schema for the Turso-backed Dragica Pršo app.

## Patterns

- Update `schema.ts` for persistent model changes.
- Generate migrations with the existing Drizzle scripts before deploying schema changes.
- Keep table and column names stable once production data exists.

## Gotchas

- Cloudflare production uses Turso env vars, so local schema changes need matching remote migration/deploy steps.
