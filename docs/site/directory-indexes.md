---
title: Directory Indexes
date: 2026-03-20
summary: Generate and maintain directory index blocks inside index.md.
---

# Directory Indexes

Use `index.md` or `README.md` as the directory page, the agent-readable index, and the local manifest for a folder.

`mdorigin build index` manages the block between:

```md
<!-- INDEX:START -->
<!-- INDEX:END -->
```

If the markers do not exist, the tool appends them to the end of the chosen directory index file.

## Commands

Update every directory under a content root that already has `index.md` or `README.md`:

```bash
npm run build:index -- --root docs/site
```

Update one directory:

```bash
npm run build:index -- --dir docs/site
```

## Generated content

The managed block includes:

- child directories, linked as `./subdir/`
- markdown files in the current directory, excluding `index.md` and `README.md`
- `title`, `date`, and `summary` metadata when available

## Sorting

- directories sort ascending by title or folder name
- articles sort descending by date
- undated articles appear after dated articles

## Draft handling

Markdown files with `draft: true` are excluded from generated directory indexes.
