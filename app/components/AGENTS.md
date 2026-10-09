# Components Guide

## Purpose

Reusable React UI for the public Dragica site and admin/newsletter workflows.

## Key Files

- `PublicSite.tsx`: public landing/site experience.
- `newsletter-builder.tsx`: admin newsletter editor, AI restructuring flow, and send controls.
- `newsletter-option-list.tsx`: option picker for newsletter titles, subtitles, and hooks.
- `http-response.ts`: defensive browser-side JSON response parser.
- `newsletter-editor-utils.ts`: browser-only sanitization and HTML helpers for the editor.
- `sign-in-panel.tsx`: Google sign-in panel for protected admin access.
- `subscriber-dashboard.tsx`: expandable subscriber total and all-time growth chart for admins.

## Patterns

- Keep public-facing copy in Croatian.
- Keep admin workflow controls dense and task-focused.
- Prefer typed props and local helper functions over loose object passing.
- Avoid adding persistence directly in components; call API routes instead.

## Gotchas

- Newsletter preview can render generated HTML; keep sanitization expectations aligned with the API/lib layer.
- Public images should come from `public/images/` or the image proxy route.
