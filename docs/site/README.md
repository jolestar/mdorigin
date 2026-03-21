---
title: mdorigin
type: page
order: 0
date: 2026-03-20
summary: Markdown-first publishing for human HTML and agent-readable raw markdown.
---

# mdorigin

`mdorigin` is a markdown-first publishing engine.

It treats markdown as the source of truth, serves raw `.md` directly for agents, and renders HTML views for humans from the same directory tree.

## Start Here

- [Getting Started](./guides/getting-started.md)
- [Configuration](./reference/configuration.md)
- [Cloudflare Deployment](./guides/cloudflare.md)

## What it does

- filesystem routes map directly to published routes
- `.md` stays accessible as raw source
- `.html` and extensionless routes render the same markdown for humans
- relative assets stay next to content
- the same core works for local Node preview and Cloudflare Workers

The site below is intentionally organized as directories so the automatic index behavior can act as the primary navigation layer.

<!-- INDEX:START -->

- [Guides](./guides/)
- [Concepts](./concepts/)
- [Reference](./reference/)

- [Why mdorigin exists](./why-mdorigin.md)
  2026-03-20 · A concise explanation of the markdown-first model and why the project avoids runtime-only content layers.

<!-- INDEX:END -->
