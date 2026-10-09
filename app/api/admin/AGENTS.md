# Admin API Guide

## Purpose

Authenticated APIs that power the private administration workspace.

## Patterns

- Require `auth()` in every route before returning operational data.
- Keep sensitive contact data server-side and return only the aggregates the UI needs.
- Place each feature in its own subdirectory with a focused `AGENTS.md` guide.
