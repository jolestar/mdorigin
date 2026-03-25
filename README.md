# mdorigin

`mdorigin` is a markdown-first publishing engine.

It treats markdown as the only source of truth, serves raw `.md` directly for agents, renders HTML for humans from the same directory tree, and can expose the same content to both browsers and tools through stable routes.

## Why mdorigin

- markdown stays directly accessible at `.md` routes
- extensionless routes render human-friendly HTML from the same files
- `README.md`, `index.md`, and `SKILL.md` all fit into one routing model
- the same core works in local preview and Cloudflare Workers
- optional search is powered by [`indexbind`](https://github.com/jolestar/indexbind)

## Install

```bash
npm install -g mdorigin
```

Then run it directly:

```bash
mdorigin dev --root docs/site
```

If you prefer a project-local install instead, use `npm install --save-dev mdorigin` and run it with `npx --no-install mdorigin ...`.

## Quick Start

```bash
mdorigin dev --root docs/site
mdorigin build index --root docs/site
mdorigin build cloudflare --root docs/site
```

That is enough to preview a site locally, keep directory indexes up to date, and generate a Cloudflare Worker bundle.

## Optional Search

`mdorigin` can build a local retrieval bundle through the optional [`indexbind`](https://github.com/jolestar/indexbind) package. For the retrieval engine itself, see the `indexbind` docs: <https://indexbind.jolestar.workers.dev>.

```bash
npm install indexbind
mdorigin build search --root docs/site
mdorigin search --index dist/search "cloudflare deploy"
```

`build search` now defaults to the higher-quality `model2vec` backend. If you need a smaller or faster fallback, you can opt back into hashing:

```bash
mdorigin build search --root docs/site --embedding-backend hashing
```

To expose the same search bundle from the site runtime:

```bash
mdorigin dev --root docs/site --search dist/search
mdorigin build cloudflare --root docs/site --search dist/search
```

Runtime endpoints:

- `/api/search?q=cloudflare+deploy`
- `/api/openapi.json`

## Docs

- Docs site: <https://mdorigin.jolestar.workers.dev>
- Getting started: [`docs/site/guides/getting-started.md`](docs/site/guides/getting-started.md)
- Routing model: [`docs/site/concepts/routing.md`](docs/site/concepts/routing.md)
- Directory indexes: [`docs/site/concepts/directory-indexes.md`](docs/site/concepts/directory-indexes.md)
- Configuration: [`docs/site/reference/configuration.md`](docs/site/reference/configuration.md)
- CLI: [`docs/site/reference/cli.md`](docs/site/reference/cli.md)
- Search setup: [`docs/site/guides/getting-started.md`](docs/site/guides/getting-started.md#quick-start)
- Cloudflare deployment: [`docs/site/guides/cloudflare.md`](docs/site/guides/cloudflare.md)
