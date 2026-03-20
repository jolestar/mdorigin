---
title: Cloudflare Deployment
date: 2026-03-20
summary: Build a user-project Worker bundle and initialize Wrangler config.
---

# Cloudflare Deployment

`mdorigin` does not ship a repo-owned `wrangler.toml`. Instead, it generates a Worker bundle for the consuming project.

## Build a Worker bundle

```bash
npm run build:cloudflare -- --root docs/site
```

By default this writes:

```text
.mdorigin/cloudflare/worker.mjs
```

The generated worker imports `mdorigin/cloudflare`, so the consuming project should keep `mdorigin` installed when deploying.

## Initialize Wrangler config

```bash
npm run init:cloudflare -- --dir .
```

That writes a starter `wrangler.jsonc` pointing at `.mdorigin/cloudflare/worker.mjs`.

## Typical flow

```bash
npm run build:index -- --root docs/site
npm run build:cloudflare -- --root docs/site
npm run init:cloudflare -- --dir .
```
