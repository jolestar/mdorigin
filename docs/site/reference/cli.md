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
- `mdorigin dev --root <content-dir> --search <search-dir>`
- `mdorigin build index --root <content-dir> --config <config-file>`
- `mdorigin build search --root <content-dir> --config <config-file>`
- `mdorigin build search --root <content-dir> --embedding-backend hashing`
- `mdorigin build cloudflare --root <content-dir> --config <config-file> --search <search-dir>`
- `mdorigin init cloudflare --dir .`
- `mdorigin search --index <search-dir> <query>`

With a project-local install, run the same commands via `npx --no-install mdorigin ...`.

Useful defaults:

- `dev`, `build index`, `build search`, and `build cloudflare` all accept `--config`
- `build search` writes to `dist/search` unless `--out` is provided
- `build search` defaults to the `model2vec` embedding backend
- `build cloudflare` writes to `dist/cloudflare/worker.mjs` unless `--out` is provided
- `init cloudflare` points to `dist/cloudflare/worker.mjs` by default
- `init cloudflare` derives the Worker name from `siteTitle` when `--name` is omitted

Search commands require the optional `indexbind` package:

```bash
npm install indexbind
```

For `indexbind` runtime and indexing details, see:

- Docs: <https://indexbind.jolestar.workers.dev>
- Repository: <https://github.com/jolestar/indexbind>

To force the older lightweight backend:

```bash
mdorigin build search --root docs/site --embedding-backend hashing
```

When `dev` or `build cloudflare` is given `--search`, the site exposes:

- `/api/search?q=...`
- `/api/openapi.json`
