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
- sitemap -> `/sitemap.xml`

If a directory has no `index.md`, the current runtime can still render a minimal fallback listing for browsing.

`/sitemap.xml` emits canonical HTML URLs, not `.md` source URLs. It requires `siteUrl` so the sitemap can use absolute locations.

Rendered HTML also exposes the source markdown path with:

```html
<link rel="alternate" type="text/markdown" href="/foo.md">
```

This is a lightweight interoperability hint for agents and tools that want to discover the raw markdown source from the human HTML page.

## Canonical markdown paths

Directory homepages support both `index.md` and `README.md`, but only one can exist as the real source file for a given directory.

- if the real file is `README.md`, requesting `index.md` redirects to `README.md`
- if the real file is `index.md`, requesting `README.md` redirects to `index.md`

This keeps raw markdown URLs canonical while still letting directories use either filename.

## Accept negotiation

Explicit paths remain stable:

- `/foo.md` always returns markdown
- `/foo.html` always returns HTML

Extensionless routes can negotiate on `Accept`:

- `/foo`
- `/`
- `/guides/`

When the request includes `Accept: text/markdown`, those routes return raw markdown instead of HTML.

For negotiated routes, responses include:

- `Vary: Accept`

Example:

```bash
curl -H "Accept: text/markdown" http://localhost:3000/guides/getting-started
```

## Aliases

Documents may declare old paths in frontmatter with `aliases`.

When a request matches one of those aliases, `mdorigin` returns a `308` redirect to the current canonical HTML route:

- directory homepages redirect to `/dir/`
- regular documents redirect to `/dir/name`

Example:

```md
---
aliases:
  - /old-guides
  - /legacy/getting-started
---
```
