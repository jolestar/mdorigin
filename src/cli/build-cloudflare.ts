import path from 'node:path';

import { createFileSystemContentStore } from '../adapters/node.js';
import { writeCloudflareBundle } from '../cloudflare.js';
import {
  applySiteConfigFrontmatterDefaults,
  loadUserSiteConfig,
} from '../core/site-config.js';

export async function runBuildCloudflareCommand(argv: string[]) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      'Usage: mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search]',
    );
    return;
  }
  if (!args.root) {
    console.error(
      'Usage: mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search]',
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(args.root);
  const loadedConfig = await loadUserSiteConfig({
    cwd: process.cwd(),
    rootDir,
    configPath: args.config,
  });
  const store = createFileSystemContentStore(rootDir);
  const siteConfig = await applySiteConfigFrontmatterDefaults(
    store,
    loadedConfig.siteConfig,
  );
  const result = await writeCloudflareBundle({
    rootDir,
    outDir: path.resolve(args.out ?? 'dist/cloudflare'),
    siteConfig,
    searchDir: args.search ? path.resolve(args.search) : undefined,
    configModulePath: loadedConfig.configModulePath,
  });

  console.log(`cloudflare worker written to ${result.workerFile}`);
}

function parseArgs(argv: string[]) {
  const result: {
    root?: string;
    out?: string;
    config?: string;
    search?: string;
    help?: boolean;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }

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
      continue;
    }

    if (argument === '--search' && nextValue) {
      result.search = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument for mdorigin build cloudflare: ${argument}`);
  }

  return result;
}
