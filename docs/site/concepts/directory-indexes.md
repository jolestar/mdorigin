---
title: Directory Indexes
order: 20
date: 2026-03-20
summary: Generate and maintain directory index blocks inside index.md or README.md.
---

# Directory Indexes

Use `index.md`, `README.md`, or `SKILL.md` as the directory page, the agent-readable index, and the local manifest for a folder.

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

When a directory contains `SKILL.md`, `mdorigin` treats it as a post bundle by default unless frontmatter explicitly sets `type: page`.

Directories treated as `type: post` are skipped by `build index`.

- `mdorigin` does not inject a managed index block into post bundles such as `post/README.md`
- this keeps article bundles clean when they only contain a homepage markdown file plus colocated assets
- the same rule applies to skill bundles such as `skill-name/SKILL.md`

For skill bundles, `build index` also treats common helper directories as non-content support files:

- `scripts/`
- `references/`
- `assets/`
- `templates/`

These directories remain directly accessible as files, but they are not recursed into for automatic content indexing.

This works the same way when skill directories are brought into the published tree through directory symlinks.

If a directory has no generated entries, the managed block is left empty instead of emitting placeholder text.

For the root homepage, HTML rendering may hide repeated `page` entries when those same destinations are already shown in the top navigation. The raw markdown remains unchanged.

When a page contains a managed index block, the default HTML renderer turns it into a structured directory-and-article listing. The raw markdown source still keeps the normal `INDEX:START/END` block.
