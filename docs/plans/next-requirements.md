# Next Requirements

## Background

`mdorigin` already proves the core idea works:

- markdown is the only source of truth
- `.md` is served directly for agents
- `.html` is rendered for humans
- relative resources can stay next to markdown files

The current prototype is still missing a few basic product-level behaviors. These should be treated as the next implementation targets.

---

## 1. Default route behavior

### Current problem

The current version mainly works for explicit file-style routes such as:

- `/posts/foo.md`
- `/posts/foo.html`

But a human-facing site should not require `.html` in normal navigation.

### Requirement

Support default HTML routes:

- `/posts/foo` -> render `posts/foo.md` as HTML
- `/notes/bar` -> render `notes/bar.md` as HTML
- `/topic/subtopic/baz` -> render `topic/subtopic/baz.md` as HTML

### Notes

- `.md` should still keep working as the raw markdown endpoint.
- `.html` should still keep working as the explicit HTML endpoint.
- The default route should prefer HTML rendering.

### Expected rule

For one markdown source file:

- `/foo.md` -> raw markdown
- `/foo.html` -> HTML
- `/foo` -> HTML

This should become the default public behavior.

---

## 2. `index.md` behavior and directory fallback

### Current problem

Directory routes do not work yet.

Examples that should work but currently return 404:

- `/`
- `/writing/`
- `/topic/`

### Requirement A: support `index.md`

If a directory contains `index.md`, then:

- `/` -> `index.md`
- `/topic/` -> `topic/index.md`
- `/topic/index.html` -> render `topic/index.md`
- `/topic/index.md` -> raw markdown for `topic/index.md`

This is the primary rule.

### Requirement B: fallback when `index.md` does not exist

If a directory route is requested and no `index.md` exists, the server may generate a simple directory listing page.

### Suggested fallback behavior

For `/topic/` when `topic/index.md` does not exist:

- enumerate files and subdirectories under `topic/`
- generate a minimal HTML page
- show markdown files as navigable entries
- show subdirectories as navigable entries
- optionally hide non-content internal files

### Why this matters

This makes the system more local-first and more filesystem-native.

A content tree can still be browsed even before every folder has an `index.md`.

### Minimum fallback scope

If fallback directory listing is implemented, it only needs:

- entry name
- entry type: file or directory
- target link

No advanced styling or metadata is required for the first version.

---

## 3. Template and theme configuration

### Current problem

The current HTML output is functional but too bare.

Even for a minimal markdown-first engine, there needs to be a simple way to control:

- layout shell
- typography
- colors
- article meta rendering

Otherwise the output is hard to use for real writing.

### Requirement

Provide a simple template configuration mechanism.

### Constraints

This should stay lightweight.

Do not turn `mdorigin` into a full theme framework or CMS.

### Suggested first version

A minimal theme configuration can include:

- one HTML document template
- one CSS file
- one configuration object for site title and metadata rendering

For example:

```text
mdorigin.config.ts
.theme/
  document.html
  site.css
```

Or:

```text
templates/
  document.ts
  style.css
```

### Minimum capability

The first theme system only needs to support:

- site title
- page title
- date display
- summary display
- article body container
- stylesheet injection

### Nice-to-have later

Later versions may support:

- list page template
- directory index template
- navigation partials
- custom meta components

But these are not required now.

---

## Recommended implementation priority

1. default route behavior
2. `index.md` resolution
3. directory fallback listing
4. minimal template/theme configuration

This order keeps the system usable first, then improves presentation.

---

## Expected outcome after this round

After these requirements are implemented, `mdorigin` should be able to support a small real blog/content tree with:

- natural HTML routes
- raw markdown access for agents
- directory home pages
- basic browsable folders
- acceptable human-facing presentation
