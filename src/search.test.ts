import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
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
    theme: 'paper',
    template: 'document',
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    catalogInitialPostCount: 10,
    catalogLoadMoreStep: 10,
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
    theme: 'paper',
    template: 'document',
    topNav: [],
    footerNav: [],
    footerText: undefined,
    socialLinks: [],
    editLink: undefined,
    showHomeIndex: true,
    catalogInitialPostCount: 10,
    catalogLoadMoreStep: 10,
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
