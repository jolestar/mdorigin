---
title: CLI
order: 20
date: 2026-03-20
summary: Command-line entrypoints for local preview, index generation, and Cloudflare bundles.
---

# CLI

Install the package in your site project:

```bash
npm install --save-dev mdorigin
```

Main commands:

- `npx mdorigin dev --root <content-dir>`
- `npx mdorigin build index --root <content-dir>`
- `npx mdorigin build cloudflare --root <content-dir>`
- `npx mdorigin init cloudflare --dir .`
