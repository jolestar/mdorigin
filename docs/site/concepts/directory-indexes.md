---
title: Directory Indexes
date: 2026-03-20
summary: Generate and maintain directory index blocks inside index.md or README.md.
---

# Directory Indexes

Use `index.md` or `README.md` as the directory page, the agent-readable index, and the local manifest for a folder.

`mdorigin build index` manages the block between:

```md
<!-- INDEX:START -->
<!-- INDEX:END -->
```

If the markers do not exist, the tool appends them to the end of the chosen directory index file.

The managed block is content-only. It no longer inserts headings such as `Directories` or `Articles`.

`build index` still keeps these categories distinct internally:

- directories are listed first
- articles are listed after directories
- directory homepage frontmatter can use `type: page` or `type: post` to override the default inference

If a directory has no generated entries, the managed block is left empty instead of emitting placeholder text.

For the root homepage, HTML rendering may hide repeated `page` entries when those same destinations are already shown in the top navigation. The raw markdown remains unchanged.
