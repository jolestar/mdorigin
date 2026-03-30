---
title: Configuration
order: 10
date: 2026-03-20
summary: Site-level configuration fields and their behavior.
---

# Configuration

Site configuration lives in the content root.

Supported config entry files:

- `<content-root>/mdorigin.config.ts`
- `<content-root>/mdorigin.config.mjs`
- `<content-root>/mdorigin.config.js`
- `<content-root>/mdorigin.config.json`

When multiple files exist, `mdorigin` prefers `.ts`, then `.mjs`, then `.js`, then `.json`.

Useful fields:

- `siteTitle`
- `siteDescription`
- `siteUrl`
- `favicon`
- `socialImage`
- `logo`
- `topNav`
- `footerNav`
- `footerText`
- `socialLinks`
- `editLink`
- `showHomeIndex`
- `listingInitialPostCount`
- `listingLoadMoreStep`
- `search`
- `showDate`
- `showSummary`
- `stylesheet`
- `plugins`

## Code Config

Use `mdorigin.config.ts` when you want code-based customization instead of pure static settings.

Example:

```ts
import { defineConfig } from "mdorigin";

export default defineConfig({
  siteTitle: "My Site",
  plugins: [
    {
      name: "custom-layout",
      renderPage(page, _context, next) {
        if (page.kind !== "listing") {
          return next(page);
        }

        const title = escapeHtml(page.title);
        return [
          "<!doctype html>",
          "<html><body>",
          `<main class="custom-listing"><h1>${title}</h1>${page.bodyHtml}</main>`,
          "</body></html>",
        ].join("");
      },
    },
  ],
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

`defineConfig` is optional. A plain default export object also works.

Current stable plugin hooks:

- `transformIndex(entries, context)`
- `renderHeader(context)`
- `renderFooter(context)`
- `renderPage(page, context, next)`
- `transformHtml(html, context)`

The design boundary is:

- `mdorigin` owns routing and content semantics
- plugins may fully replace page rendering
- plugins should not replace the request kernel itself

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
- `footerNav` is always explicit and is not auto-derived from the content tree.

## Branding

- `siteUrl` sets the canonical site origin and is used for canonical links in rendered HTML.
- `siteUrl` also enables `/sitemap.xml`, which emits absolute canonical URLs.
- `favicon` adds a standard favicon link tag.
- `socialImage` emits absolute `og:image` and `twitter:image` metadata when `siteUrl` is set.
- `logo` renders a small site logo in the header.

Example:

```json
{
  "siteUrl": "https://example.com",
  "favicon": "/favicon.svg",
  "socialImage": "/og.svg",
  "logo": {
    "src": "/logo.svg",
    "alt": "Example"
  }
}
```

## Footer

`mdorigin` supports a small set of explicit footer settings:

- `footerNav`
- `footerText`
- `socialLinks`
- `editLink`

Example:

```json
{
  "footerNav": [
    { "label": "GitHub", "href": "https://github.com/example/repo" }
  ],
  "footerText": "Built with mdorigin.",
  "socialLinks": [
    { "icon": "github", "label": "GitHub", "href": "https://github.com/example/repo" }
  ],
  "editLink": {
    "baseUrl": "https://github.com/example/repo/edit/main/docs/"
  }
}
```

Built-in social icons currently include:

- `github`
- `npm`
- `rss`
- `x`
- `home`

`footerText` has no implicit default. If you omit it, `mdorigin` does not render footer copy on its own.

## Default Presentation

`mdorigin` ships one built-in presentation.

- it uses the default atlas-style baseline
- it renders ordinary pages and managed index listings with the same outer document shell
- if you want a different layout or styling, use `stylesheet` or code-based hooks instead of selecting a built-in theme/template variant

When a page contains a managed index block, the default renderer turns article entries into a structured listing and supports incremental `Load more` batches. You can tune that listing behavior with:

```json
{
  "listingInitialPostCount": 10,
  "listingLoadMoreStep": 10
}
```

Rules:

- `listingInitialPostCount` controls how many article entries are rendered in the first HTML response
- `listingLoadMoreStep` controls how many additional article entries each `Load more` request appends
- directory entries are still rendered in full; the limit only applies to article entries in the managed listing
- both fields default to `10`

## Search Profile

When a site exposes a search bundle through `mdorigin dev --search ...` or a deployed search API, `mdorigin` can apply a site-level search profile.

Example:

```json
{
  "search": {
    "topK": 10,
    "mode": "hybrid",
    "minScore": 0.05,
    "reranker": {
      "kind": "embedding-v1",
      "candidatePoolSize": 25
    },
    "scoreAdjustment": {
      "metadataNumericMultiplier": "directory_weight"
    }
  }
}
```

Supported fields:

- `search.topK`
- `search.mode`
- `search.minScore`
- `search.reranker.kind`
- `search.reranker.candidatePoolSize`
- `search.scoreAdjustment.metadataNumericMultiplier`

Rules:

- `search.topK` sets the default result count for `/api/search` when the request does not provide its own `topK`
- `search.mode` accepts `hybrid` or `vector`
- `search.minScore` drops weak tail matches after final scoring
- `search.reranker` configures the optional final reranking stage
- `search.scoreAdjustment.metadataNumericMultiplier` points to a numeric metadata field that should multiply the final score
- `/api/search` still keeps a small public surface: `q`, `topK`, and `meta.<field>`
- retrieval mode, reranker choice, score adjustment, and score cutoff stay in site configuration rather than public query parameters

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

## Rendering Flags

- `showDate` controls whether parsed markdown dates are surfaced in rendered HTML where the default presentation uses them
- `showSummary` controls whether configured summaries are surfaced in rendered HTML where the default presentation uses them
- both flags default to `true`

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
