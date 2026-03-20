---
title: mdorigin
date: 2026-03-20
summary: Markdown-first publishing for human HTML and agent-readable raw markdown.
---

# mdorigin

`mdorigin` is a markdown-first publishing engine.

It treats markdown as the source of truth, serves raw `.md` directly for agents, and renders HTML views for humans from the same directory tree.

## What it does

- filesystem routes map directly to published routes
- `.md` stays accessible as raw source
- `.html` and extensionless routes render the same markdown for humans
- relative assets stay next to content
- the same core works for local Node preview and Cloudflare Workers

## Start here

- [Getting Started](./getting-started.md)
- [Routing Model](./routing.md)
- [Directory Indexes](./directory-indexes.md)
- [Cloudflare Deployment](./cloudflare.md)

<!-- INDEX:START -->

## Articles
- [Cloudflare Deployment](./cloudflare.md)
  2026-03-20 · Build a user-project Worker bundle and initialize Wrangler config.

- [Directory Indexes](./directory-indexes.md)
  2026-03-20 · Generate and maintain directory index blocks inside index.md.

- [Getting Started](./getting-started.md)
  2026-03-20 · Preview content locally, configure a site, and build indexes.

- [Routing Model](./routing.md)
  2026-03-20 · Understand how markdown, HTML, directory routes, and assets map to URLs.

<!-- INDEX:END -->
