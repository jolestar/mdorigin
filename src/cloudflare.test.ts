import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildCloudflareManifest,
  initCloudflareProject,
  writeCloudflareBundle,
} from './cloudflare.js';

test('buildCloudflareManifest includes entries and site config', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-manifest-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');

  const manifest = await buildCloudflareManifest({
    rootDir,
    siteConfig: {
      siteTitle: 'Manifest Site',
      showDate: true,
      showSummary: true,
      theme: 'paper',
      template: 'document',
      topNav: [],
      showHomeIndex: true,
      siteTitleConfigured: true,
      siteDescriptionConfigured: false,
    },
  });

  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0]?.path, 'index.md');
  assert.equal(manifest.siteConfig?.siteTitle, 'Manifest Site');
});

test('writeCloudflareBundle writes a user-facing worker entry', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-bundle-root-'));
  const outDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-bundle-out-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');

  const result = await writeCloudflareBundle({
    rootDir,
    outDir,
    siteConfig: {
      siteTitle: 'Bundle Site',
      showDate: true,
      showSummary: true,
      theme: 'paper',
      template: 'document',
      topNav: [],
      showHomeIndex: true,
      siteTitleConfigured: true,
      siteDescriptionConfigured: false,
    },
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  assert.match(workerSource, /from 'mdorigin\/cloudflare'/);
  assert.match(workerSource, /Bundle Site/);
});

test('initCloudflareProject writes wrangler config', async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-init-'));
  const workerEntry = path.join(projectDir, '.mdorigin', 'cloudflare', 'worker.mjs');

  const result = await initCloudflareProject({
    projectDir,
    workerEntry,
    workerName: 'docs-site',
    compatibilityDate: '2026-03-20',
  });

  const configSource = await readFile(result.configFile, 'utf8');
  assert.match(configSource, /"name": "docs-site"/);
  assert.match(configSource, /"\.mdorigin\/cloudflare\/worker\.mjs"/);
});
