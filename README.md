# mdorigin

`mdorigin` is a markdown-first publishing engine.

It treats markdown as the only source of truth, serves raw `.md` directly for agents, and renders `.html` views for humans from the same directory tree.

## Design goals

- Keep original markdown unchanged.
- Map filesystem structure directly to routes.
- Serve raw markdown and rendered HTML side by side.
- Keep images and attachments next to the article, referenced via relative paths.
- Run both locally and on Cloudflare Workers.

## Core model

Given a configured content root such as `docs/site/`:

- `foo.md` -> `/foo.md`
- `foo.html` -> renders `foo.md`
- `topic/bar.md` -> `/topic/bar.md`
- `topic/bar.html` -> renders `topic/bar.md`
- `topic/index.md` -> `/topic/` and `/topic/index.html`
- `topic/diagram.png` -> `/topic/diagram.png`

Markdown is the source. HTML is a derived view.

## Content conventions

Recommended structure:

```text
docs/site/
  README.md
  getting-started.md
  guides/
    index.md
    cloudflare.md
    diagram.png
```

Example article body:

```md
---
title: Bitcoin L2
date: 2026-03-20
summary: A markdown-first article.
---

This is the article body.

![](./architecture.png)
```

## Why this exists

Traditional static blog tools are good at publishing, but they often force markdown to adapt to the publishing system.

`mdorigin` goes the other way:

- markdown stays in its original local-first form
- humans read rendered HTML
- agents read raw markdown
- relative resource paths stay intact

## Planned runtime shape

### Core

A small TypeScript core that handles:

- route resolution
- frontmatter parsing
- markdown rendering
- relative resource resolution
- draft filtering

### Adapters

- Node adapter for local preview
- Cloudflare adapter for deployment

## First milestone

- configure one content root
- serve `.md`
- render `.html`
- support `index.md`
- support relative images and attachments
- parse minimal frontmatter
- support `draft: true`

## Not in the first milestone

- tags and archives
- search
- RSS
- sitemap
- authoring UI
- CMS features

## Development

```bash
npm install
npm run check
npm run dev -- --root docs/site
npm run build:index -- --root docs/site
```

Optional site config:

```json
{
  "siteTitle": "Example Notes",
  "siteDescription": "Short description shown in the header.",
  "showDate": true,
  "showSummary": true,
  "theme": "atlas",
  "topNav": [
    { "label": "About", "href": "/about/" },
    { "label": "Projects", "href": "/projects/" }
  ],
  "showHomeIndex": false,
  "stylesheet": "./.theme/site.css"
}
```

Save that as `<content-root>/mdorigin.config.json`. The loader prefers:

1. `--config`
2. `<content-root>/mdorigin.config.json`
3. current working directory `mdorigin.config.json` as a compatibility fallback

The stylesheet file is read and inlined into rendered HTML for both Node preview and Cloudflare bundles.

Built-in themes:

- `paper`: restrained single-column writing theme, inspired by minimal blog defaults such as Jekyll-style reading layouts
- `atlas`: clean docs-and-blog hybrid with stronger navigation and code presentation
- `gazette`: warmer editorial layout for essay-style publishing

`topNav` controls a small hand-written global navigation. `showHomeIndex` only affects HTML rendering for `/`: when set to `false`, the root page hides the auto-generated `INDEX:START/END` block, but the raw markdown still keeps it.

## Build Worker

```bash
npm run build:cloudflare -- --root docs/site
npm run init:cloudflare
```

This writes a user-project Worker entrypoint to `.mdorigin/cloudflare/worker.mjs` and a starter `wrangler.jsonc` in the current directory. The generated worker imports `mdorigin/cloudflare`, so the consuming project should keep `mdorigin` installed as a dependency when deploying with Wrangler.

## Build Directory Indexes

```bash
npm run build:index -- --root docs/site
npm run build:index -- --dir docs/site
```

`build index` updates the tool-managed block between `<!-- INDEX:START -->` and `<!-- INDEX:END -->` inside the directory homepage file. It prefers `index.md`, then falls back to `README.md`. If the markers do not exist, it appends a managed block to the end of the file.
