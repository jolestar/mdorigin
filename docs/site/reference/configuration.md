---
title: Configuration
date: 2026-03-20
summary: Site-level configuration fields and their behavior.
---

# Configuration

Site configuration lives in `<content-root>/mdorigin.config.json`.

Useful fields:

- `siteTitle`
- `siteDescription`
- `theme`
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
