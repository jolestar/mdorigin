---
title: Routing Model
order: 10
date: 2026-03-20
summary: Understand how markdown, HTML, directory routes, and assets map to URLs.
---

# Routing Model

Given a content root:

```text
docs/site/
  README.md
  guides/
    README.md
    getting-started.md
```

`mdorigin` resolves routes like this:

- `README.md` -> `/README.md`
- directory homepage -> `/` using `index.md`, or `README.md` if `index.md` is absent
- `guides/getting-started.md` -> `/guides/getting-started.md`, `/guides/getting-started.html`, `/guides/getting-started`

If a directory has no `index.md`, the current runtime can still render a minimal fallback listing for browsing.
