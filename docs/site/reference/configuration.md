---
title: Configuration
order: 10
date: 2026-03-20
summary: Site-level configuration fields and their behavior.
---

# Configuration

Site configuration lives in `<content-root>/mdorigin.config.json`.

Useful fields:

- `siteTitle`
- `siteDescription`
- `theme`
- `template`
- `topNav`
- `showHomeIndex`
- `stylesheet`

## Site Metadata

- If `siteTitle` is configured, it is used directly.
- Otherwise `mdorigin` falls back to the root homepage frontmatter:
  - `title` -> `siteTitle`
  - `summary` -> `siteDescription`
- If neither config nor root homepage frontmatter provides a value, `siteTitle` falls back to `mdorigin`.

## Navigation

- If `topNav` is configured, `mdorigin` uses it directly.
- If `topNav` is omitted or empty, `mdorigin` derives navigation from the content root's first-level subdirectories.
- Auto-derived navigation only includes directories treated as `type: page`.
- Directories treated as `type: post` are excluded from auto-derived top navigation.
- When the root homepage already has top navigation, the HTML view hides repeated `page` entries from the managed root index block and keeps only the remaining entries, such as posts.

## Template

`mdorigin` currently supports two built-in template variants:

- `document`: the default docs-and-notes layout
- `editorial`: a more article-led layout with a dedicated page intro block

The `theme` still controls colors, typography, and spacing. `template` controls the page structure.

## Directory Type

Directory homepage files may declare a content type in frontmatter:

```md
---
title: Projects
type: page
---
```

```md
---
title: Why mdorigin exists
type: post
---
```

Rules:

- `type: page` is for sections, landing pages, and navigable collections
- `type: post` is for article containers such as `post/README.md` with colocated assets
- if `type` is omitted, `mdorigin` uses lightweight inference and does not write the result back to frontmatter

## Order

Markdown frontmatter may define `order`:

```md
---
title: Getting Started
order: 10
---
```

Rules:

- lower `order` values come first
- `order` is used for auto-derived top navigation and for directory index generation
- when `order` is absent, `mdorigin` falls back to its default sort rules

## Aliases

Markdown frontmatter may define old URLs that should redirect to the current canonical route:

```md
---
title: Hello
aliases:
  - /hello-world
  - /old/hello
---
```

Rules:

- `aliases` may be a string or a string array
- alias requests return `308` redirects
- aliases redirect to the canonical HTML route for the current document
- directory homepages redirect to `/dir/`
- regular markdown documents redirect to `/dir/name`
- draft documents do not expose aliases in exclude mode
