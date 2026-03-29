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
      'Usage: mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search] [--binary-mode inline|external] [--assets-max-bytes 26214400] [--r2-binding MDORIGIN_R2]',
    );
    return;
  }
  if (!args.root) {
    console.error(
      'Usage: mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search] [--binary-mode inline|external] [--assets-max-bytes 26214400] [--r2-binding MDORIGIN_R2]',
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
    binaryMode: args.binaryMode,
    assetsMaxBytes: args.assetsMaxBytes,
    r2Binding: args.r2Binding,
  });

  console.log(`cloudflare worker written to ${result.workerFile}`);
}

function parseArgs(argv: string[]) {
  const result: {
    root?: string;
    out?: string;
    config?: string;
    search?: string;
    binaryMode?: 'inline' | 'external';
    assetsMaxBytes?: number;
    r2Binding?: string;
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

    if (argument === '--binary-mode' && nextValue) {
      if (nextValue !== 'inline' && nextValue !== 'external') {
        throw new Error(`Invalid binary mode for mdorigin build cloudflare: ${nextValue}`);
      }
      result.binaryMode = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--assets-max-bytes' && nextValue) {
      const parsed = Number.parseInt(nextValue, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid value for --assets-max-bytes: ${nextValue}`);
      }
      result.assetsMaxBytes = parsed;
      index += 1;
      continue;
    }

    if (argument === '--r2-binding' && nextValue) {
      result.r2Binding = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument for mdorigin build cloudflare: ${argument}`);
  }

  return result;
}
