import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MemoryContentStore } from './content-store.js';
import {
  applySiteConfigFrontmatterDefaults,
  loadSiteConfig,
} from './site-config.js';

test('loadSiteConfig prefers content root config over cwd config', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'mdorigin-config-cwd-'));
  const rootDir = path.join(cwd, 'docs', 'site');
  await mkdir(rootDir, { recursive: true });

  await writeFile(
    path.join(cwd, 'mdorigin.config.json'),
    JSON.stringify({ siteTitle: 'cwd-title', theme: 'paper' }, null, 2),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'mdorigin.config.json'),
    JSON.stringify(
      {
        siteTitle: 'root-title',
        theme: 'gazette',
        siteUrl: 'https://example.com',
        favicon: 'favicon.svg',
        logo: { src: 'logo.svg', alt: 'Example Logo' },
        footerNav: [{ label: 'GitHub', href: 'https://github.com/example/repo' }],
        footerText: 'Footer note',
        socialLinks: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/example/repo' }],
        editLink: { baseUrl: 'https://github.com/example/repo/edit/main/docs/' },
        catalogInitialPostCount: 6,
        catalogLoadMoreStep: 4,
      },
      null,
      2,
    ),
    'utf8',
  );

  const config = await loadSiteConfig({ cwd, rootDir });

  assert.equal(config.siteTitle, 'root-title');
  assert.equal(config.theme, 'gazette');
  assert.equal(config.template, 'document');
  assert.equal(config.siteUrl, 'https://example.com');
  assert.equal(config.favicon, '/favicon.svg');
  assert.deepEqual(config.logo, { src: '/logo.svg', alt: 'Example Logo', href: undefined });
  assert.equal(config.footerNav[0]?.label, 'GitHub');
  assert.equal(config.footerText, 'Footer note');
  assert.equal(config.socialLinks[0]?.icon, 'github');
  assert.deepEqual(config.editLink, {
    baseUrl: 'https://github.com/example/repo/edit/main/docs/',
  });
  assert.equal(config.catalogInitialPostCount, 6);
  assert.equal(config.catalogLoadMoreStep, 4);
});

test('applySiteConfigFrontmatterDefaults uses root homepage frontmatter when config is absent', async () => {
  const config = await loadSiteConfig({
    cwd: await mkdtemp(path.join(tmpdir(), 'mdorigin-config-fallback-')),
  });
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Example Site',
        'summary: Example description',
        '---',
        '',
        '# Example Site',
      ].join('\n'),
    },
  ]);

  const resolved = await applySiteConfigFrontmatterDefaults(store, config);

  assert.equal(resolved.siteTitle, 'Example Site');
  assert.equal(resolved.siteDescription, 'Example description');
});

test('applySiteConfigFrontmatterDefaults does not override explicit config values', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Example Site',
        'summary: Example description',
        '---',
        '',
        '# Example Site',
      ].join('\n'),
    },
  ]);

  const resolved = await applySiteConfigFrontmatterDefaults(store, {
    siteTitle: 'Configured Title',
    siteDescription: 'Configured Description',
    siteUrl: undefined,
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
    siteTitleConfigured: true,
    siteDescriptionConfigured: true,
  });

  assert.equal(resolved.siteTitle, 'Configured Title');
  assert.equal(resolved.siteDescription, 'Configured Description');
});
