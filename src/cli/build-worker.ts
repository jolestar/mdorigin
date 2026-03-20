import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getMediaTypeForPath,
  isLikelyTextPath,
  normalizeContentPath,
} from '../core/content-store.js';
import type { CloudflareManifestEntry } from '../adapters/cloudflare.js';
import { loadSiteConfig } from '../core/site-config.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root) {
    console.error(
      'Usage: npm run build:worker -- --root <content-dir> [--out dist/worker.mjs]',
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(args.root);
  const outFile = path.resolve(args.out ?? 'dist/worker.mjs');
  const siteConfig = await loadSiteConfig({
    cwd: process.cwd(),
    configPath: args.config,
  });
  const manifest = await buildManifest(rootDir);
  const workerSource = [
    "import { createCloudflareWorker } from './adapters/cloudflare.js';",
    '',
    `const manifest = ${JSON.stringify(
      { entries: manifest, siteConfig },
      null,
      2,
    )};`,
    '',
    'export default createCloudflareWorker(manifest);',
    '',
  ].join('\n');

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, workerSource, 'utf8');

  console.log(`worker bundle written to ${outFile}`);
}

async function buildManifest(rootDir: string): Promise<CloudflareManifestEntry[]> {
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
  return entries;
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

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv: string[]) {
  const result: { root?: string; out?: string; config?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--root' && nextValue) {
      result.root = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--out' && nextValue) {
      result.out = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--config' && nextValue) {
      result.config = nextValue;
      index += 1;
    }
  }

  return result;
}
