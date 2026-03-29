import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildSearchBundle, searchBundle } from './search.js';
import type { ResolvedSiteConfig } from './core/site-config.js';

test('buildSearchBundle and searchBundle integrate through indexbind', async (t) => {
  try {
    await import('indexbind/web');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(path.join(rootDir, 'guides'), { recursive: true });
  await writeFile(
    path.join(rootDir, 'README.md'),
    [
      '---',
      'title: Example Site',
      'summary: Example summary',
      '---',
      '',
      '# Example Site',
      '',
      'Home page.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'guides', 'cloudflare.md'),
    [
      '---',
      'title: Cloudflare Guide',
      'summary: Deploy on Cloudflare Workers.',
      '---',
      '',
      '# Cloudflare Guide',
      '',
      'Use mdorigin build cloudflare and wrangler deploy.',
      '',
    ].join('\n'),
    'utf8',
  );

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: 'Example summary',
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: true,
  };

  const result = await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
  });
  assert.equal(result.documentCount, 2);

  const hits = await searchBundle({
    indexDir: outDir,
    query: 'cloudflare deploy',
    topK: 5,
  });

  assert.ok(hits.length > 0);
  assert.equal(hits[0]?.title, 'Cloudflare Guide');
});

test('searchBundle prefers concrete documents over overview pages', async (t) => {
  try {
    await import('indexbind/web');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(path.join(rootDir, 'guides'), { recursive: true });

  await writeFile(
    path.join(rootDir, 'README.md'),
    '# Example Site\n',
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'guides', 'README.md'),
    [
      '---',
      'title: Guides',
      'type: page',
      'summary: Browse setup and deployment guides.',
      '---',
      '',
      '# Guides',
      '',
      'Cloudflare deployment and local preview guides live here.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'guides', 'cloudflare.md'),
    [
      '---',
      'title: Cloudflare Deployment',
      'type: post',
      'summary: Deploy on Cloudflare Workers.',
      '---',
      '',
      '# Cloudflare Deployment',
      '',
      'Use mdorigin build cloudflare and wrangler deploy to publish the site.',
      '',
    ].join('\n'),
    'utf8',
  );

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: undefined,
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: false,
  };

  await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
  });

  const hits = await searchBundle({
    indexDir: outDir,
    query: 'cloudflare deploy',
    topK: 5,
  });

  assert.ok(hits.length > 1);
  assert.equal(hits[0]?.title, 'Cloudflare Deployment');
  assert.equal(hits[1]?.title, 'Guides');
});

test('searchBundle excludes frontmatter values from excerpts', async (t) => {
  try {
    await import('indexbind/web');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-frontmatter-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(rootDir, { recursive: true });
  await writeFile(
    path.join(rootDir, 'README.md'),
    [
      '---',
      'title: Frontmatter Example',
      'summary: Search excerpt should not come from frontmatter.',
      'slug: hidden-frontmatter-slug',
      '---',
      '',
      '# Frontmatter Example',
      '',
      'Visible body content only.',
      '',
    ].join('\n'),
    'utf8',
  );

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: undefined,
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: false,
  };

  await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
  });

  const hits = await searchBundle({
    indexDir: outDir,
    query: 'hidden-frontmatter-slug',
    topK: 5,
  });

  assert.equal(hits.length, 0);
});

test('searchBundle excludes managed index and machine-only comments from excerpts', async (t) => {
  try {
    await import('indexbind/web');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-comments-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(rootDir, { recursive: true });
  await writeFile(
    path.join(rootDir, 'README.md'),
    [
      '# Home',
      '',
      '<!-- mdorigin:internal hidden-comment-token -->',
      '',
      '<!-- INDEX:START -->',
      '',
      '- [Cloudflare](./guides/cloudflare.md)',
      '',
      '<!-- INDEX:END -->',
      '',
      'Visible body content only.',
      '',
    ].join('\n'),
    'utf8',
  );

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: undefined,
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: false,
  };

  await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
  });

  const markerHits = await searchBundle({
    indexDir: outDir,
    query: 'hidden-comment-token',
    topK: 5,
  });
  const indexHits = await searchBundle({
    indexDir: outDir,
    query: 'INDEX START',
    topK: 5,
  });

  assert.equal(markerHits.length, 0);
  assert.equal(indexHits.length, 0);
});

test('searchBundle supports metadata filtering with section and type metadata', async (t) => {
  try {
    await import('indexbind/web');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-meta-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(path.join(rootDir, 'guides'), { recursive: true });
  await mkdir(path.join(rootDir, 'posts'), { recursive: true });
  await writeFile(path.join(rootDir, 'README.md'), '# Home\n', 'utf8');
  await writeFile(
    path.join(rootDir, 'guides', 'cloudflare.md'),
    ['---', 'title: Guides Cloudflare', 'type: page', '---', '', '# Guides Cloudflare', '', 'Deploy cloudflare guides.'].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'posts', 'cloudflare.md'),
    ['---', 'title: Post Cloudflare', 'type: post', '---', '', '# Post Cloudflare', '', 'Cloudflare post content.'].join('\n'),
    'utf8',
  );

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: undefined,
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: false,
  };

  await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
  });

  const filteredHits = await searchBundle({
    indexDir: outDir,
    query: 'cloudflare',
    metadata: {
      section: 'posts',
      type: 'post',
    },
  });

  assert.equal(filteredHits.length, 1);
  assert.equal(filteredHits[0]?.title, 'Post Cloudflare');
  assert.equal(filteredHits[0]?.metadata.section, 'posts');
  assert.equal(filteredHits[0]?.metadata.type, 'post');
});

test('buildSearchBundle supports incremental rebuilds with removed documents', async (t) => {
  try {
    await import('indexbind/web');
    await import('indexbind/build');
  } catch {
    t.skip('indexbind is not installed');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mdorigin-search-incremental-'));
  const rootDir = path.join(tempDir, 'site');
  const outDir = path.join(tempDir, 'search');
  await mkdir(rootDir, { recursive: true });
  await writeFile(path.join(rootDir, 'README.md'), '# Home\n', 'utf8');
  await writeFile(path.join(rootDir, 'removed.md'), '# Removed\n\nLegacy incremental token.\n', 'utf8');

  const siteConfig: ResolvedSiteConfig = {
    siteTitle: 'Example Site',
    siteDescription: undefined,
    siteUrl: 'https://example.com',
    favicon: undefined,
    logo: undefined,
    showDate: true,
    showSummary: true,
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    listingInitialPostCount: 10,
    listingLoadMoreStep: 10,
    stylesheetContent: undefined,
    siteTitleConfigured: true,
    siteDescriptionConfigured: false,
  };

  const first = await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
    incremental: true,
  });

  assert.equal(first.incremental?.newDocumentCount, 2);
  assert.match(first.cachePath ?? '', /search\.indexbind-cache\.sqlite$/);

  await rm(path.join(rootDir, 'removed.md'));

  const second = await buildSearchBundle({
    rootDir,
    outDir,
    siteConfig,
    embeddingBackend: 'hashing',
    incremental: true,
  });

  assert.equal(second.incremental?.removedDocumentCount, 1);

  const hits = await searchBundle({
    indexDir: outDir,
    query: 'legacy incremental token',
    topK: 5,
  });
  assert.equal(hits.length, 0);
});
