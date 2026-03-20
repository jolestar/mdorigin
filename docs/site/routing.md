---
title: Routing Model
date: 2026-03-20
summary: Understand how markdown, HTML, directory routes, and assets map to URLs.
---

# Routing Model

Given a content root:

```text
docs/site/
  README.md
  getting-started.md
  guides/
    index.md
    cloudflare.md
    diagram.png
```

`mdorigin` resolves routes like this:

- `README.md` -> `/README.md`
- directory homepage -> `/` using `index.md`, or `README.md` if `index.md` is absent
- `getting-started.md` -> `/getting-started.md`, `/getting-started.html`, `/getting-started`
- `guides/index.md` -> `/guides/`, `/guides/index.html`, `/guides/index.md`
- `guides/cloudflare.md` -> `/guides/cloudflare.md`, `/guides/cloudflare.html`, `/guides/cloudflare`
- `guides/diagram.png` -> `/guides/diagram.png`

## Directory behavior

If a directory has `index.md`, that file is the directory page. If not, `README.md` is used as the directory page fallback.

If a directory has no `index.md`, the current runtime can still render a minimal fallback listing for browsing. The preferred long-term model is to keep a real `index.md` in each published directory and maintain its generated index block with `mdorigin build index`.
