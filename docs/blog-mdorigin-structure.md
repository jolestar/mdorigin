# blog-mdorigin Structure

## Goal

Use one Obsidian-friendly repository as the full writing workspace, while keeping published content under a single `public/` tree that `mdorigin` can serve directly.

This structure should optimize for:

- local-first writing
- agent-friendly raw markdown access
- simple publishing rules
- minimal protocol surface

---

## Repository shape

```text
blog-mdorigin/
  index.md
  public/
    README.md
    projects/
      README.md
    about/
      README.md
  drafts/
  review/
  tweets/
  assets/
```

---

## Directory roles

### `public/`

This is the only published content root.

Anything under `public/` is considered public site content.

`mdorigin` should be configured to serve this directory directly.

### `drafts/`

Local drafts and unfinished writing.

Not published.

### `review/`

Near-final writing waiting for review, polish, or publishing.

Not published.

### `tweets/`

Tweet drafts, thread drafts, repost copy, and X article support material.

Not published.

### `assets/`

Local working assets that are not yet part of published content.

Not published.

### `index.md`

Vault-level landing page for Obsidian use.

This is for the writing workspace itself, not the public site.

---

## Published content shape

The `public/` tree stays intentionally flat at the top level.

There is no separate `articles/`, `writing/`, or category tree required by default.

### Current public sections

- `public/README.md` -> site home
- `public/projects/README.md` -> projects section index
- `public/about/README.md` -> about page

This means the public root only keeps a few stable entry points.

If more sections are needed later, they can be added explicitly as first-level directories.

---

## Why not `writing/` or `articles/`

Using `public/writing/` introduces an unnecessary semantic layer.

- `writing/` can be confused with work-in-progress content
- `articles/` is valid, but still adds one more container directory that may not be necessary

Flattening directly under `public/` keeps the public model simpler:

- the public tree is the site tree
- first-level nodes become top-level navigation candidates

---

## README.md compatibility

`mdorigin` should treat `README.md` as equivalent to `index.md` for directory entry pages.

This is useful for two reasons:

1. it improves GitHub browsing
2. it keeps directories readable both in git hosting UIs and in `mdorigin`

### Suggested precedence

For a directory entry page:

1. `index.md`
2. `README.md`
3. `_index.md` should not be treated as a long-term first-class rule

That means:

- `public/README.md` can act as `/`
- `public/projects/README.md` can act as `/projects/`
- `public/about/README.md` can act as `/about/`

If `index.md` exists, it should win.

If only `README.md` exists, it should be used as the directory document.

---

## Navigation rule

Top-level navigation should come from the direct children of `public/`.

### Suggested behavior

- `README.md` / `index.md` at the root -> site home, not a nav item
- direct child directories -> top nav items
- optional direct child markdown pages -> top nav items
- hidden files or underscored internal files -> excluded

With the current structure, top navigation would naturally include:

- `projects`
- `about`

This keeps the site minimal by default.

---

## Agent behavior

Agents should read raw markdown directly from the public tree.

Examples:

- `/README.md`
- `/projects/README.md`
- `/about/README.md`

This keeps the public source readable without introducing a second manifest or JSON layer.

---

## Publishing rule

Publishing means moving or syncing reviewed content into `public/`.

Examples:

- `review/some-post/` -> `public/some-post/`
- `review/projects/uxc/` -> `public/projects/uxc/`

The public tree is the final published markdown source.

The workspace tree remains separate.

---

## Long-term note

This structure intentionally avoids carrying Hugo-specific conventions forward.

In particular:

- no `_index.md` as a first-class protocol
- no `posts/notes` split as a publishing model
- no extra manifest file by default

The public markdown tree itself is the protocol.
