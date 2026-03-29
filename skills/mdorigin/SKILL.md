---
name: mdorigin
description: Build, preview, and deploy markdown-first sites with local preview, Cloudflare bundles, and agent-readable raw markdown routes.
---

# mdorigin

Use this skill when you want to work on a markdown-first publishing site powered by `mdorigin`.

## Install

Global install:

```bash
npm install -g mdorigin
```

Project-local install:

```bash
npm install --save-dev mdorigin
```

## What it covers

- local preview with `mdorigin dev`
- directory index generation with `mdorigin build index`
- search index generation with `mdorigin build search`
- Cloudflare Worker bundle output with `mdorigin build cloudflare`
- external binary deployment flow for Cloudflare Assets + R2
- markdown and HTML route behavior, including `Accept: text/markdown`

## Quick commands

```bash
mdorigin dev --root docs/site
mdorigin build index --root docs/site
mdorigin build search --root docs/site
mdorigin build cloudflare --root docs/site
```

External binary deploy flow:

```bash
mdorigin build cloudflare --root docs/site --binary-mode external
mdorigin sync cloudflare-r2 --dir dist/cloudflare --bucket <bucket-name>
mdorigin init cloudflare --dir . --r2-bucket <bucket-name>
```

## Remote docs

When an agent needs details, prefer the published docs instead of duplicating everything in the skill:

- HTML docs: `https://mdorigin.jolestar.workers.dev`
- Raw markdown home: `https://mdorigin.jolestar.workers.dev/README.md`
- Routing docs: `https://mdorigin.jolestar.workers.dev/concepts/routing.md`
- Configuration docs: `https://mdorigin.jolestar.workers.dev/reference/configuration.md`
- Extensions docs: `https://mdorigin.jolestar.workers.dev/guides/extensions.md`
- Cloudflare docs: `https://mdorigin.jolestar.workers.dev/guides/cloudflare.md`

Extensionless routes also return markdown when the client sends `Accept: text/markdown`.

## Search

Use search when you need the right doc page before opening it:

- Search API: `https://mdorigin.jolestar.workers.dev/api/search?q=<query>`
- OpenAPI schema: `https://mdorigin.jolestar.workers.dev/api/openapi.json`

Examples:

```bash
curl 'https://mdorigin.jolestar.workers.dev/api/search?q=cloudflare%20deploy'
curl -H 'Accept: text/markdown' 'https://mdorigin.jolestar.workers.dev/guides/getting-started'
```
