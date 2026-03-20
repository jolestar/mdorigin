# Index as Text Index

## Goal

Use `index.md` as the single directory index document.

The file should serve three roles at the same time:

1. human-facing directory page
2. agent-readable directory index
3. lightweight manifest for the current directory

This avoids introducing a separate `index.json` or runtime-only directory listing protocol.

---

## Core idea

Each content directory may contain `index.md`.

That file has two parts:

1. handwritten section
   - directory description
   - introduction text
   - editorial notes

2. generated section
   - subdirectory listing
   - article listing
   - basic metadata for each entry

The generated section is maintained by a build/update tool.

The handwritten section remains untouched.

---

## File format

Recommended structure:

```md
# Writing

This directory contains long-form writing and thread essays.

<!-- INDEX:START -->

## Directories
- [AI](./ai/)
- [Bitcoin](./bitcoin/)

## Articles
- [How to define Bitcoin L2](./how-to-define-bitcoin-l2.md)  
  2024-03-04 · An engineering-oriented breakdown of Bitcoin L2 boundaries.

- [Web3 from AI perspective](./web3-from-ai-perspective.md)  
  2023-02-23 · Reframing Web3 from the perspective of AI capabilities.

<!-- INDEX:END -->
```

### Rules

- The block between `<!-- INDEX:START -->` and `<!-- INDEX:END -->` is tool-managed.
- Everything outside that block is author-managed.
- The tool must only replace the generated block.

---

## Directory indexing behavior

### A. Subdirectories

List child directories that should be navigable.

For each child directory:
- link to `./subdir/`
- display a title

### Child directory title resolution

Priority:
1. child `index.md` title
2. directory name

---

### B. Articles

List markdown files in the current directory.

Exclude:
- `index.md`

For each article entry, render:
- title
- date
- summary
- relative markdown link

### Article title resolution

Priority:
1. frontmatter `title`
2. file name

### Article date resolution

Priority:
1. frontmatter `date`
2. omit if missing

### Article summary resolution

Priority:
1. frontmatter `summary`
2. optional first paragraph fallback

---

## Sorting

Suggested defaults:

- subdirectories: ascending by title/name
- articles: descending by date
- undated articles appear after dated articles

---

## Routing behavior

### Raw markdown

When an agent or user requests `index.md`, the response should be the actual markdown file content, including the generated index block.

That means the raw markdown is already sufficient as a directory index.

### HTML rendering

When a human requests the directory page such as `/writing/`, the renderer should simply render the existing `index.md`.

It should not inject an extra runtime-only listing layer.

This keeps the markdown and the HTML view aligned.

---

## Why this model

### Advantages

- no extra `index.json`
- no separate manifest protocol
- agent can read raw markdown and get the index directly
- humans and agents see the same directory structure
- directory description stays editable by hand

### Tradeoff

The index is not purely runtime-generated.
It must be updated when directory contents change.

This is acceptable if the update flow is explicit and stable.

---

## Update mechanism

### First version

Provide an explicit build/update command.

Examples:

```bash
mdorigin build index --root content/writing
mdorigin build index --dir content/writing/bitcoin
```

### Tool behavior

- scan target directories
- find `index.md`
- compute the directory listing block
- replace only the generated block
- preserve all handwritten content outside the block

---

## First milestone scope

The first implementation only needs to support:

1. `index.md` detection
2. generated block replacement
3. child directory listing
4. article listing
5. `title`, `date`, `summary`
6. default sorting

Not required in the first milestone:

- tag aggregation
- cross-directory indexes
- backlinks
- search
- graph views
- custom section schemas

---

## Expected result

After this is implemented:

- a directory page is represented by a real markdown file
- agents can read raw `index.md` and understand the local content tree
- humans can read the rendered HTML from the same source
- the system stays markdown-first without adding a second manifest format
