import path from 'node:path';

import { buildSearchBundle } from '../search.js';
import { applySiteConfigFrontmatterDefaults, loadSiteConfig } from '../core/site-config.js';
import { createFileSystemContentStore } from '../adapters/node.js';

export async function runBuildSearchCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  if (!args.root) {
    throw new Error(
      'Usage: mdorigin build search --root <content-dir> [--out ./dist/search] [--embedding-backend model2vec|hashing] [--model sentence-transformers/all-MiniLM-L6-v2] [--config mdorigin.config.json]',
    );
  }

  const rootDir = path.resolve(args.root);
  const store = createFileSystemContentStore(rootDir);
  const siteConfig = await applySiteConfigFrontmatterDefaults(
    store,
    await loadSiteConfig({
      rootDir,
      configPath: args.config,
    }),
  );
  const result = await buildSearchBundle({
    rootDir,
    outDir: path.resolve(args.out ?? 'dist/search'),
    siteConfig,
    embeddingBackend: args.embeddingBackend ?? 'model2vec',
    model: args.model,
  });

  console.log(
    `search bundle written to ${result.outputDir} (${result.documentCount} documents, ${result.chunkCount} chunks)`,
  );
}

function parseArgs(rawArgs: string[]) {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg.startsWith('--')) {
      const value = rawArgs[index + 1];
      if (value && !value.startsWith('--')) {
        parsed[arg.slice(2)] = value;
        index += 1;
      }
    }
  }

  return {
    root: parsed.root,
    out: parsed.out,
    embeddingBackend: parsed['embedding-backend'] as 'hashing' | 'model2vec' | undefined,
    model: parsed.model,
    config: parsed.config,
  };
}
