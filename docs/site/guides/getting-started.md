---
title: Getting Started
date: 2026-03-20
summary: Preview content locally, configure a site, and build indexes.
---

# Getting Started

## Install

```bash
npm install
npm run check
```

## Preview a site

Use a content root such as `docs/site`:

```bash
npm run dev -- --root docs/site
```

That starts a local preview server and serves:

- raw markdown at `/foo.md`
- HTML at `/foo.html`
- default human routes at `/foo`

## Site config

Create `mdorigin.config.json` inside the content root, for example `docs/site/mdorigin.config.json`.

If `stylesheet` is set, the CSS file is read and inlined into rendered HTML for both local preview and Cloudflare bundles. By default the loader prefers:

1. `--config`
2. `<content-root>/mdorigin.config.json`
3. current working directory `mdorigin.config.json`
