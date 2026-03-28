import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
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
      siteDescriptionConfigured: false,
    },
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  assert.match(workerSource, /from 'mdorigin\/cloudflare-runtime'/);
  assert.match(workerSource, /Bundle Site/);
});

test('writeCloudflareBundle imports code config when configModulePath is provided', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-config-root-'));
  const outDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-config-out-'));
  const configFile = path.join(rootDir, 'mdorigin.config.ts');
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(
    configFile,
    'export default { plugins: [{ name: "custom" }] };\n',
    'utf8',
  );

  const result = await writeCloudflareBundle({
    rootDir,
    outDir,
    configModulePath: configFile,
    siteConfig: {
      siteTitle: 'Bundle Site',
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
      siteDescriptionConfigured: false,
    },
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  assert.match(workerSource, /import userConfig from/);
  assert.match(workerSource, /plugins: Array\.isArray\(userConfig\?\.plugins\)/);
});

test('initCloudflareProject writes wrangler config', async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-init-'));
  const workerEntry = path.join(projectDir, 'dist', 'cloudflare', 'worker.mjs');

  const result = await initCloudflareProject({
    projectDir,
    workerEntry,
    workerName: 'docs-site',
    compatibilityDate: '2026-03-20',
  });

  const configSource = await readFile(result.configFile, 'utf8');
  assert.match(configSource, /"name": "docs-site"/);
  assert.match(configSource, /"dist\/cloudflare\/worker\.mjs"/);
  assert.match(configSource, /"compatibility_flags": \["nodejs_compat"\]/);
});

test('initCloudflareProject derives worker name from site title when name is omitted', async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-init-slug-'));
  const workerEntry = path.join(projectDir, 'dist', 'cloudflare', 'worker.mjs');

  const result = await initCloudflareProject({
    projectDir,
    workerEntry,
    siteTitle: 'Example Notes',
    compatibilityDate: '2026-03-20',
  });

  const configSource = await readFile(result.configFile, 'utf8');
  assert.match(configSource, /"name": "example-notes"/);
  assert.match(configSource, /"compatibility_flags": \["nodejs_compat"\]/);
});

test('buildCloudflareManifest follows directory symlinks', async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-symlink-'));
  const rootDir = path.join(workspaceDir, 'docs', 'site');
  const skillsDir = path.join(workspaceDir, 'skills');
  await mkdir(rootDir, { recursive: true });
  await mkdir(path.join(skillsDir, 'find-skills'), { recursive: true });
  await writeFile(path.join(rootDir, 'README.md'), '# Home\n', 'utf8');
  await writeFile(
    path.join(skillsDir, 'find-skills', 'SKILL.md'),
    ['---', 'name: find-skills', 'description: Discover skills.', '---', '', '# Find Skills'].join('\n'),
    'utf8',
  );
  await symlink(path.join(workspaceDir, 'skills'), path.join(rootDir, 'skills'));

  const manifest = await buildCloudflareManifest({
    rootDir,
    siteConfig: {
      siteTitle: 'Manifest Site',
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
      siteDescriptionConfigured: false,
    },
  });

  assert.ok(manifest.entries.some((entry) => entry.path === 'skills/find-skills/SKILL.md'));
});

test('buildCloudflareManifest includes optional search bundle entries', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-search-root-'));
  const searchDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-search-dir-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(
    path.join(searchDir, 'manifest.json'),
    '{"artifactFormat":"file-bundle-v1"}\n',
    'utf8',
  );

  const manifest = await buildCloudflareManifest({
    rootDir,
    searchDir,
    siteConfig: {
      siteTitle: 'Manifest Site',
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
      siteDescriptionConfigured: false,
    },
  });

  assert.equal(manifest.searchEntries?.[0]?.path, 'manifest.json');
});
