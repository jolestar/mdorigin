---
title: Getting Started
order: 10
date: 2026-03-20
summary: Preview content locally, configure a site, and build indexes.
---

# Getting Started

## Quick Start

```bash
npm install -g mdorigin
mdorigin dev --root docs/site
mdorigin build index --root docs/site
```

That is enough to preview a site locally, keep directory indexes up to date, and confirm the content model before touching deployment.

To generate a Worker bundle after that:

```bash
mdorigin build cloudflare --root docs/site
```

`mdorigin` also works well with skill repositories that use `SKILL.md` as the main document file. Those folders are treated as document bundles, while helper directories such as `scripts/` and `references/` stay directly accessible but do not enter automatic indexes.

If your published content lives under `docs/site` but your reusable content lives elsewhere in the repo, you can also expose it with directory symlinks. For example:

```text
docs/site/skills -> ../../skills
```

`mdorigin dev`, `mdorigin build index`, and Cloudflare bundle generation all follow those symlinked directories.

For local retrieval during development, install `indexbind` and build a search bundle:

```bash
npm install indexbind
mdorigin build search --root docs/site
mdorigin search --index dist/search "cloudflare deploy"
```

`indexbind` documentation:

- Docs: <https://indexbind.jolestar.workers.dev>
- Repository: <https://github.com/jolestar/indexbind>

`build search` now defaults to the higher-quality `model2vec` backend. If you want the smaller legacy fallback instead, run:

```bash
mdorigin build search --root docs/site --embedding-backend hashing
```

To expose the same bundle as a site API during local preview:

```bash
mdorigin dev --root docs/site --search dist/search
```

Available endpoints:

- `/api/search?q=cloudflare+deploy`
- `/api/openapi.json`

## Install

```bash
npm install -g mdorigin
```

If you prefer a project-local install, use:

```bash
npm install --save-dev mdorigin
```

## Preview a site

Use a content root such as `docs/site`:

```bash
mdorigin dev --root docs/site
```

That starts a local preview server and serves:

- raw markdown at `/foo.md`
- HTML at `/foo.html`
- default human routes at `/foo`
- markdown on extensionless routes when the client sends `Accept: text/markdown`

For example:

```bash
curl -H "Accept: text/markdown" http://localhost:3000/guides/getting-started
```

## Site config

Create `mdorigin.config.json` inside the content root, for example `docs/site/mdorigin.config.json`.

If no config file is present, `mdorigin` falls back to the root homepage frontmatter:

- `title` becomes the default site title
- `summary` becomes the default site description

If `stylesheet` is set, the CSS file is read and inlined into rendered HTML for both local preview and Cloudflare bundles. By default the loader prefers:

1. `--config`
2. `<content-root>/mdorigin.config.json`
3. current working directory `mdorigin.config.json`

You can also choose a page structure with `template`:

```json
{
  "siteUrl": "https://example.com",
  "favicon": "/favicon.svg",
  "theme": "atlas",
  "template": "document",
  "footerNav": [
    { "label": "GitHub", "href": "https://github.com/example/repo" }
  ]
}
```

Use `document` for ordinary docs and articles. Use `catalog` for homepages and directory-style collection pages.

Today `template` only selects from built-in page structures. The longer-term direction is not to add a large template system, but to allow code-based extensions to replace page rendering while keeping the same routing and normalized content model.

If you use `catalog`, you can also cap the first batch of article entries:

```json
{
  "template": "catalog",
  "catalogInitialPostCount": 10,
  "catalogLoadMoreStep": 10
}
```

## Build directory indexes

```bash
mdorigin build index --root docs/site
```
