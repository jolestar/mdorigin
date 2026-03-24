# mdorigin

`mdorigin` is a markdown-first publishing engine.

It treats markdown as the only source of truth, serves raw `.md` directly for agents, renders `.html` views for humans from the same directory tree, can return markdown from extensionless routes when clients send `Accept: text/markdown`, supports frontmatter aliases for old URL redirects, and can publish skill-style bundles built around `SKILL.md`.

## Install

```bash
npm install -g mdorigin
```

Then run it directly:

```bash
mdorigin dev --root docs/site
```

If you prefer a project-local install instead, use `npm install --save-dev mdorigin` and run it with `npx --no-install mdorigin ...`.

## Repo Development

```bash
npm install
npm run check
npm run dev -- --root docs/site
npm run build:index -- --root docs/site
```

## Docs

- Getting started: [`docs/site/guides/getting-started.md`](docs/site/guides/getting-started.md)
- Routing model: [`docs/site/concepts/routing.md`](docs/site/concepts/routing.md)
- Directory indexes: [`docs/site/concepts/directory-indexes.md`](docs/site/concepts/directory-indexes.md)
- Configuration: [`docs/site/reference/configuration.md`](docs/site/reference/configuration.md)
- CLI: [`docs/site/reference/cli.md`](docs/site/reference/cli.md)
- Cloudflare deployment: [`docs/site/guides/cloudflare.md`](docs/site/guides/cloudflare.md)
