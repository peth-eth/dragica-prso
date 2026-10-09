# Newsletter Send Route Guide

## Purpose

Sends a saved newsletter through Resend and marks it sent only after Resend confirms the broadcast.

## Rules

- Require an authenticated admin session.
- Return JSON for every success and failure path so the admin client can show a useful message.
- Never mark a newsletter as sent when broadcast creation or sending fails.
