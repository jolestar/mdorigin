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
    JSON.stringify({ siteTitle: 'root-title', theme: 'gazette' }, null, 2),
    'utf8',
  );

  const config = await loadSiteConfig({ cwd, rootDir });

  assert.equal(config.siteTitle, 'root-title');
  assert.equal(config.theme, 'gazette');
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
    showDate: true,
    showSummary: true,
    theme: 'paper',
    topNav: [],
    showHomeIndex: true,
    siteTitleConfigured: true,
    siteDescriptionConfigured: true,
  });

  assert.equal(resolved.siteTitle, 'Configured Title');
  assert.equal(resolved.siteDescription, 'Configured Description');
});
