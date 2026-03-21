import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
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

export { createCloudflareWorker };
export type { CloudflareManifest, CloudflareManifestEntry };

export interface BuildCloudflareManifestOptions {
  rootDir: string;
  siteConfig: ResolvedSiteConfig;
}

export interface WriteCloudflareBundleOptions {
  rootDir: string;
  outDir: string;
  siteConfig: ResolvedSiteConfig;
  packageImport?: string;
}

export interface InitCloudflareProjectOptions {
  projectDir: string;
  workerEntry: string;
  workerName?: string;
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

  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    entries,
    siteConfig: options.siteConfig,
  };
}

export async function writeCloudflareBundle(
  options: WriteCloudflareBundleOptions,
): Promise<{ manifest: CloudflareManifest; workerFile: string }> {
  const outDir = path.resolve(options.outDir);
  const manifest = await buildCloudflareManifest({
    rootDir: options.rootDir,
    siteConfig: options.siteConfig,
  });
  const packageImport = options.packageImport ?? 'mdorigin/cloudflare-runtime';
  const workerFile = path.join(outDir, 'worker.mjs');
  const workerSource = [
    `import { createCloudflareWorker } from '${packageImport}';`,
    '',
    `const manifest = ${JSON.stringify(manifest, null, 2)};`,
    '',
    'export default createCloudflareWorker(manifest);',
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

  const workerName = options.workerName ?? 'mdorigin-site';
  const compatibilityDate = options.compatibilityDate ?? '2026-03-20';
  const wranglerConfig = [
    '{',
    '  "$schema": "./node_modules/wrangler/config-schema.json",',
    `  "name": ${JSON.stringify(workerName)},`,
    `  "main": ${JSON.stringify(toPosixPath(path.relative(projectDir, options.workerEntry)))},`,
    `  "compatibility_date": ${JSON.stringify(compatibilityDate)}`,
    '}',
    '',
  ].join('\n');

  await mkdir(projectDir, { recursive: true });
  await writeFile(configFile, wranglerConfig, 'utf8');

  return { configFile };
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
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
