---
title: CLI
order: 20
date: 2026-03-20
summary: Command-line entrypoints for local preview, index generation, and Cloudflare bundles.
---

# CLI

Recommended install:

```bash
npm install -g mdorigin
```

Project-local install also works:

```bash
npm install --save-dev mdorigin
```

Main commands:

- `mdorigin dev --root <content-dir>`
- `mdorigin build index --root <content-dir>`
- `mdorigin build search --root <content-dir>`
- `mdorigin build cloudflare --root <content-dir>`
- `mdorigin init cloudflare --dir .`
- `mdorigin search --index <search-dir> <query>`

With a project-local install, run the same commands via `npx --no-install mdorigin ...`.

Useful defaults:

- `build search` writes to `dist/search` unless `--out` is provided
- `build cloudflare` writes to `dist/cloudflare/worker.mjs` unless `--out` is provided
- `init cloudflare` points to `dist/cloudflare/worker.mjs` by default
- `init cloudflare` derives the Worker name from `siteTitle` when `--name` is omitted

Search commands require the optional `indexbind` package:

```bash
npm install indexbind
```
