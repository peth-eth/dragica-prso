# Subscriber Stats API Guide

## Purpose

Serves authenticated aggregate newsletter-subscriber data for the admin dashboard.

## Patterns

- Require `auth()` before returning subscriber information.
- Return aggregates and dated counts only; never expose subscriber email addresses to the client.
- Use `getSubscriberStats` from `lib/resend.ts` as the Resend integration boundary.
