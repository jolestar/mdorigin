---
title: Getting Started
order: 10
date: 2026-03-20
summary: Preview content locally, configure a site, and build indexes.
---

# Getting Started

## Install

```bash
npm install --save-dev mdorigin
```

## Preview a site

Use a content root such as `docs/site`:

```bash
npx mdorigin dev --root docs/site
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
  "theme": "atlas",
  "template": "document"
}
```

Use `document` for ordinary docs and articles. Use `catalog` for homepages and directory-style collection pages.

## Build directory indexes

```bash
npx mdorigin build index --root docs/site
```
