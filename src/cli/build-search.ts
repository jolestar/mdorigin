import path from 'node:path';

import { buildSearchBundle } from '../search.js';
import {
  applySiteConfigFrontmatterDefaults,
  loadUserSiteConfig,
} from '../core/site-config.js';
import { createFileSystemContentStore } from '../adapters/node.js';

export async function runBuildSearchCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  if (args.help) {
    console.log(
      'Usage: mdorigin build search --root <content-dir> [--out ./dist/search] [--embedding-backend model2vec|hashing] [--model sentence-transformers/all-MiniLM-L6-v2] [--config <config-file>]',
    );
    return;
  }
  if (!args.root) {
    throw new Error(
      'Usage: mdorigin build search --root <content-dir> [--out ./dist/search] [--embedding-backend model2vec|hashing] [--model sentence-transformers/all-MiniLM-L6-v2] [--config <config-file>]',
    );
  }

  const rootDir = path.resolve(args.root);
  const store = createFileSystemContentStore(rootDir);
  const loadedConfig = await loadUserSiteConfig({
    rootDir,
    configPath: args.config,
  });
  const siteConfig = await applySiteConfigFrontmatterDefaults(
    store,
    loadedConfig.siteConfig,
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
  const supportedFlags = new Set(['root', 'out', 'embedding-backend', 'model', 'config']);

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = 'true';
      continue;
    }
    if (arg.startsWith('--')) {
      const flag = arg.slice(2);
      if (!supportedFlags.has(flag)) {
        throw new Error(`Unknown argument for mdorigin build search: ${arg}`);
      }

      const value = rawArgs[index + 1];
      if (value && !value.startsWith('--')) {
        parsed[flag] = value;
        index += 1;
        continue;
      }

      throw new Error(`Incomplete argument for mdorigin build search: ${arg}`);
    }

    throw new Error(`Unknown positional argument for mdorigin build search: ${arg}`);
  }

  return {
    root: parsed.root,
    out: parsed.out,
    embeddingBackend: parsed['embedding-backend'] as 'hashing' | 'model2vec' | undefined,
    model: parsed.model,
    config: parsed.config,
    help: parsed.help === 'true',
  };
}
