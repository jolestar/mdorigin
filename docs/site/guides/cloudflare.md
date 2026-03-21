---
title: Cloudflare Deployment
order: 20
date: 2026-03-20
summary: Build a user-project Worker bundle and initialize Wrangler config.
---

# Cloudflare Deployment

`mdorigin` does not ship a repo-owned `wrangler.toml`. Instead, it generates a Worker bundle for the consuming project.

Install `mdorigin` in the project first:

```bash
npm install --save-dev mdorigin
```

## Build a Worker bundle

```bash
npx mdorigin build cloudflare --root docs/site
```

By default this writes:

```text
dist/cloudflare/worker.mjs
```

## Initialize Wrangler config

```bash
npx mdorigin init cloudflare --dir .
```

After deployment, extensionless routes on the Worker can also return markdown when a client sends:

```http
Accept: text/markdown
```

That lets agents fetch markdown directly from the site domain without adding `.md` to the URL.
