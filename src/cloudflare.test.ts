import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildCloudflareManifest,
  initCloudflareProject,
  syncCloudflareR2,
  writeCloudflareBundle,
} from './cloudflare.js';

const TEST_SITE_CONFIG = {
  siteTitle: 'Manifest Site',
  siteUrl: undefined,
  favicon: undefined,
  logo: undefined,
  showDate: true,
  showSummary: true,
  theme: 'paper' as const,
  template: 'document' as const,
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
};

test('buildCloudflareManifest includes entries and site config', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-manifest-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');

  const manifest = await buildCloudflareManifest({
    rootDir,
    siteConfig: TEST_SITE_CONFIG,
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
      ...TEST_SITE_CONFIG,
      siteTitle: 'Bundle Site',
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
      ...TEST_SITE_CONFIG,
      siteTitle: 'Bundle Site',
    },
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  assert.match(workerSource, /import \* as userConfigModule from/);
  assert.match(workerSource, /function unwrapUserConfigModule/);
  assert.match(workerSource, /plugins: Array\.isArray\(userConfig\?\.plugins\)/);
});

test('writeCloudflareBundle unwraps named config exports for code config modules', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-config-root-'));
  const outDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-config-out-'));
  const configFile = path.join(rootDir, 'mdorigin.config.ts');
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(
    configFile,
    'export const config = { plugins: [{ name: "custom" }] };\n',
    'utf8',
  );

  const result = await writeCloudflareBundle({
    rootDir,
    outDir,
    configModulePath: configFile,
    siteConfig: {
      ...TEST_SITE_CONFIG,
      siteTitle: 'Bundle Site',
    },
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  assert.match(workerSource, /const userConfig = unwrapUserConfigModule\(userConfigModule\);/);
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
    siteConfig: TEST_SITE_CONFIG,
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
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(manifest.searchEntries?.[0]?.path, 'manifest.json');
});

test('buildCloudflareManifest externalizes binaries and ignores hidden files', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-external-'));
  await mkdir(path.join(rootDir, '.private'), { recursive: true });
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(path.join(rootDir, '.DS_Store'), 'junk', 'utf8');
  await writeFile(path.join(rootDir, '.private', 'note.md'), '# Hidden\n', 'utf8');
  await writeFile(path.join(rootDir, 'small.png'), Uint8Array.from([1, 2, 3]));
  await writeFile(path.join(rootDir, 'large.mp4'), Uint8Array.from([1, 2, 3, 4, 5, 6]));

  const manifest = await buildCloudflareManifest({
    rootDir,
    siteConfig: TEST_SITE_CONFIG,
    binaryMode: 'external',
    assetsMaxBytes: 4,
  });

  assert.equal(manifest.runtime?.binaryMode, 'external');
  assert.ok(!manifest.entries.some((entry) => entry.path === '.DS_Store'));
  assert.ok(!manifest.entries.some((entry) => entry.path === '.private/note.md'));

  const assetEntry = manifest.entries.find((entry) => entry.path === 'small.png');
  assert.deepEqual(assetEntry, {
    path: 'small.png',
    kind: 'binary',
    mediaType: 'image/png',
    storageKind: 'assets',
    storageKey: 'small.png',
    byteSize: 3,
  });

  const r2Entry = manifest.entries.find((entry) => entry.path === 'large.mp4');
  assert.equal(r2Entry?.kind, 'binary');
  assert.equal('storageKind' in (r2Entry ?? {}) && r2Entry.storageKind, 'r2');
  assert.match(
    'storageKey' in (r2Entry ?? {}) ? r2Entry.storageKey : '',
    /^binary\/[a-f0-9]{64}\.mp4$/,
  );
});

test('writeCloudflareBundle writes staging metadata for external binaries', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-stage-root-'));
  const outDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-stage-out-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(path.join(rootDir, 'small.png'), Uint8Array.from([1, 2, 3]));
  await writeFile(path.join(rootDir, 'large.mp4'), Uint8Array.from([1, 2, 3, 4, 5, 6]));

  const result = await writeCloudflareBundle({
    rootDir,
    outDir,
    siteConfig: TEST_SITE_CONFIG,
    binaryMode: 'external',
    assetsMaxBytes: 4,
  });

  const workerSource = await readFile(result.workerFile, 'utf8');
  const bundleMetadata = JSON.parse(
    await readFile(result.bundleFile, 'utf8'),
  ) as {
    binaryMode: string;
    r2Objects: Array<{ file: string; storageKey: string }>;
  };

  assert.match(workerSource, /"storageKind": "assets"/);
  assert.match(workerSource, /"storageKind": "r2"/);
  assert.ok(!workerSource.includes('"base64"'));
  assert.equal(bundleMetadata.binaryMode, 'external');
  assert.equal(bundleMetadata.r2Objects.length, 1);
  await stat(path.join(outDir, 'assets', 'small.png'));
  await stat(path.join(outDir, bundleMetadata.r2Objects[0]!.file));
});

test('initCloudflareProject writes assets and r2 config for external bundle', async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-init-external-'));
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-init-root-'));
  const outDir = path.join(projectDir, 'dist', 'cloudflare');
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(path.join(rootDir, 'large.mp4'), Uint8Array.from([1, 2, 3, 4, 5, 6]));

  const bundle = await writeCloudflareBundle({
    rootDir,
    outDir,
    siteConfig: TEST_SITE_CONFIG,
    binaryMode: 'external',
    assetsMaxBytes: 4,
  });

  const result = await initCloudflareProject({
    projectDir,
    workerEntry: bundle.workerFile,
    compatibilityDate: '2026-03-20',
    r2Bucket: 'media-bucket',
  });

  const configSource = await readFile(result.configFile, 'utf8');
  assert.match(configSource, /"assets": \{/);
  assert.match(configSource, /"directory": "dist\/cloudflare\/assets"/);
  assert.match(configSource, /"run_worker_first": true/);
  assert.match(configSource, /"binding": "MDORIGIN_R2"/);
  assert.match(configSource, /"bucket_name": "media-bucket"/);
});

test('syncCloudflareR2 uploads only missing objects and writes sync state', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-sync-root-'));
  const outDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-cf-sync-out-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Home\n', 'utf8');
  await writeFile(path.join(rootDir, 'large.mp4'), Uint8Array.from([1, 2, 3, 4, 5, 6]));

  await writeCloudflareBundle({
    rootDir,
    outDir,
    siteConfig: TEST_SITE_CONFIG,
    binaryMode: 'external',
    assetsMaxBytes: 4,
  });

  const calls: string[] = [];
  const runCommand = (command: string, args: string[]) => {
    calls.push([command, ...args].join(' '));
    return { status: 0, stderr: '' };
  };

  const first = await syncCloudflareR2({
    dir: outDir,
    bucketName: 'media-bucket',
    runCommand,
  });
  const second = await syncCloudflareR2({
    dir: outDir,
    bucketName: 'media-bucket',
    runCommand,
  });
  const third = await syncCloudflareR2({
    dir: outDir,
    bucketName: 'media-bucket',
    force: true,
    runCommand,
  });

  assert.equal(first.uploadedCount, 1);
  assert.equal(first.skippedCount, 0);
  assert.equal(second.uploadedCount, 0);
  assert.equal(second.skippedCount, 1);
  assert.equal(third.uploadedCount, 1);
  assert.equal(calls.length, 2);
  await stat(first.stateFile);
});
