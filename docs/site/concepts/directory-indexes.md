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

The managed block keeps directories and articles distinct:

- `## Directories`
- `## Articles`
