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

## Optional Search

`mdorigin` can build a local retrieval bundle through the optional [`indexbind`](https://github.com/jolestar/indexbind) package:

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

## Repo Development

```bash
npm install
npm run check
npm run dev -- --root docs/site
npm run build:index -- --root docs/site
```

## Release

Publishing is handled by GitHub Actions through npm trusted publishing.

- workflow: `.github/workflows/publish.yml`
- trigger: push a tag like `v0.1.2`, or run the workflow manually

The npm package settings still need a one-time trusted publisher entry for:

- owner: `jolestar`
- repository: `mdorigin`
- workflow file: `publish.yml`

## Docs

- Getting started: [`docs/site/guides/getting-started.md`](docs/site/guides/getting-started.md)
- Routing model: [`docs/site/concepts/routing.md`](docs/site/concepts/routing.md)
- Directory indexes: [`docs/site/concepts/directory-indexes.md`](docs/site/concepts/directory-indexes.md)
- Configuration: [`docs/site/reference/configuration.md`](docs/site/reference/configuration.md)
- CLI: [`docs/site/reference/cli.md`](docs/site/reference/cli.md)
- Cloudflare deployment: [`docs/site/guides/cloudflare.md`](docs/site/guides/cloudflare.md)
