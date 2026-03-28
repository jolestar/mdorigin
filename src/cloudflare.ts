import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  CloudflareManifest,
  CloudflareManifestEntry,
} from './adapters/cloudflare.js';
import { createCloudflareWorker } from './adapters/cloudflare.js';
import {
  getMediaTypeForPath,
  isLikelyTextPath,
  normalizeContentPath,
} from './core/content-store.js';
import type { ResolvedSiteConfig } from './core/site-config.js';
import type { SearchBundleEntry } from './search.js';

export { createCloudflareWorker };
export type { CloudflareManifest, CloudflareManifestEntry };

export interface BuildCloudflareManifestOptions {
  rootDir: string;
  siteConfig: ResolvedSiteConfig;
  searchDir?: string;
}

export interface WriteCloudflareBundleOptions {
  rootDir: string;
  outDir: string;
  siteConfig: ResolvedSiteConfig;
  packageImport?: string;
  searchDir?: string;
  configModulePath?: string;
}

export interface InitCloudflareProjectOptions {
  projectDir: string;
  workerEntry: string;
  workerName?: string;
  siteTitle?: string;
  compatibilityDate?: string;
  force?: boolean;
}

export async function buildCloudflareManifest(
  options: BuildCloudflareManifestOptions,
): Promise<CloudflareManifest> {
  const rootDir = path.resolve(options.rootDir);
  const files = await listFiles(rootDir);
  const entries: CloudflareManifestEntry[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath).replaceAll(path.sep, '/');
    const normalizedPath = normalizeContentPath(relativePath);
    if (normalizedPath === null) {
      continue;
    }

    const mediaType = getMediaTypeForPath(normalizedPath);
    if (isLikelyTextPath(normalizedPath)) {
      entries.push({
        path: normalizedPath,
        kind: 'text',
        mediaType,
        text: await readFile(filePath, 'utf8'),
      });
      continue;
    }

    entries.push({
      path: normalizedPath,
      kind: 'binary',
      mediaType,
      base64: (await readFile(filePath)).toString('base64'),
    });
  }

  const searchEntries = options.searchDir
    ? await readBundleEntries(path.resolve(options.searchDir))
    : undefined;

  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    entries,
    siteConfig: options.siteConfig,
    searchEntries,
  };
}

export async function writeCloudflareBundle(
  options: WriteCloudflareBundleOptions,
): Promise<{ manifest: CloudflareManifest; workerFile: string }> {
  const outDir = path.resolve(options.outDir);
  const manifest = await buildCloudflareManifest({
    rootDir: options.rootDir,
    siteConfig: options.siteConfig,
    searchDir: options.searchDir,
  });
  const packageImport = options.packageImport ?? 'mdorigin/cloudflare-runtime';
  const workerFile = path.join(outDir, 'worker.mjs');
  const configImportPath = options.configModulePath
    ? toPosixPath(path.relative(outDir, options.configModulePath))
    : null;
  const workerSource = [
    `import { createCloudflareWorker } from '${packageImport}';`,
    configImportPath
      ? `import * as userConfigModule from '${configImportPath.startsWith('.') ? configImportPath : `./${configImportPath}`}';`
      : '',
    '',
    `const manifest = ${JSON.stringify(manifest, null, 2)};`,
    '',
    configImportPath
      ? [
          'function unwrapUserConfigModule(moduleValue) {',
          '  let current = moduleValue;',
          "  while (current && typeof current === 'object' && 'default' in current && current.default !== undefined) {",
          '    current = current.default;',
          '  }',
          "  if (current && typeof current === 'object' && 'config' in current && current.config !== undefined) {",
          '    return current.config;',
          '  }',
          '  return current;',
          '}',
          '',
          'const userConfig = unwrapUserConfigModule(userConfigModule);',
          '',
        ].join('\n')
      : '',
    configImportPath
      ? 'export default createCloudflareWorker(manifest, { plugins: Array.isArray(userConfig?.plugins) ? userConfig.plugins : [] });'
      : 'export default createCloudflareWorker(manifest);',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(workerFile, workerSource, 'utf8');

  return {
    manifest,
    workerFile,
  };
}

export async function initCloudflareProject(
  options: InitCloudflareProjectOptions,
): Promise<{ configFile: string }> {
  const projectDir = path.resolve(options.projectDir);
  const configFile = path.join(projectDir, 'wrangler.jsonc');
  const existing = await pathExists(configFile);
  if (existing && !options.force) {
    throw new Error(
      `Refusing to overwrite ${configFile}. Re-run with --force to replace it.`,
    );
  }

  const workerName =
    options.workerName ??
    slugifyWorkerName(options.siteTitle) ??
    'mdorigin-site';
  const compatibilityDate = options.compatibilityDate ?? '2026-03-20';
  const wranglerConfig = [
    '{',
    '  "$schema": "./node_modules/wrangler/config-schema.json",',
    `  "name": ${JSON.stringify(workerName)},`,
    `  "main": ${JSON.stringify(toPosixPath(path.relative(projectDir, options.workerEntry)))},`,
    `  "compatibility_date": ${JSON.stringify(compatibilityDate)},`,
    '  "compatibility_flags": ["nodejs_compat"]',
    '}',
    '',
  ].join('\n');

  await mkdir(projectDir, { recursive: true });
  await writeFile(configFile, wranglerConfig, 'utf8');

  return { configFile };
}

async function listFiles(
  directory: string,
  visitedRealDirectories = new Set<string>(),
): Promise<string[]> {
  const directoryRealPath = await realpath(directory);
  if (visitedRealDirectories.has(directoryRealPath)) {
    return [];
  }
  visitedRealDirectories.add(directoryRealPath);

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const entryStats = await stat(fullPath);
    if (entryStats.isDirectory()) {
      files.push(...(await listFiles(fullPath, visitedRealDirectories)));
      continue;
    }

    if (entryStats.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readBundleEntries(directory: string): Promise<SearchBundleEntry[]> {
  const files = await listFiles(directory);
  const entries: SearchBundleEntry[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(directory, filePath).replaceAll(path.sep, '/');
    const mediaType = getMediaTypeForPath(relativePath);
    if (isLikelyTextPath(relativePath) || relativePath.endsWith('.json')) {
      entries.push({
        path: relativePath,
        kind: 'text',
        mediaType,
        text: await readFile(filePath, 'utf8'),
      });
      continue;
    }

    entries.push({
      path: relativePath,
      kind: 'binary',
      mediaType,
      base64: (await readFile(filePath)).toString('base64'),
    });
  }

  entries.sort((left, right) => left.path.localeCompare(right.path));
  return entries;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }

    throw error;
  }
}

function toPosixPath(filePath: string): string {
  return filePath.replaceAll(path.sep, '/');
}

function slugifyWorkerName(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug === '' ? null : slug;
}
