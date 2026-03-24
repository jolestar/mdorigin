---
name: mdorigin
description: Build, preview, and deploy markdown-first sites with local preview, Cloudflare bundles, and agent-readable raw markdown routes.
---

# mdorigin

Use this skill when you want to work on a markdown-first publishing site powered by `mdorigin`.

## What it covers

- local preview with `mdorigin dev`
- directory index generation with `mdorigin build index`
- Cloudflare Worker bundle output with `mdorigin build cloudflare`
- markdown and HTML route behavior, including `Accept: text/markdown`

## Quick commands

```bash
mdorigin dev --root docs/site
mdorigin build index --root docs/site
mdorigin build cloudflare --root docs/site
```

## Notes

- `index.md`, `README.md`, and `SKILL.md` can all act as directory homepage files
- skills are published as post bundles, so they appear in article flows instead of directory flows
- helper files under `scripts/`, `references/`, `assets/`, and `templates/` stay directly accessible but are not indexed as content
