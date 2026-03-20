import path from 'node:path';

import { writeCloudflareBundle } from '../cloudflare.js';
import { loadSiteConfig } from '../core/site-config.js';

export async function runBuildCloudflareCommand(argv: string[]) {
  const args = parseArgs(argv);
  if (!args.root) {
    console.error(
      'Usage: mdorigin build cloudflare --root <content-dir> [--out ./.mdorigin/cloudflare] [--config mdorigin.config.json]',
    );
    process.exitCode = 1;
    return;
  }

  const siteConfig = await loadSiteConfig({
    cwd: process.cwd(),
    rootDir: path.resolve(args.root),
    configPath: args.config,
  });
  const result = await writeCloudflareBundle({
    rootDir: path.resolve(args.root),
    outDir: path.resolve(args.out ?? '.mdorigin/cloudflare'),
    siteConfig,
  });

  console.log(`cloudflare worker written to ${result.workerFile}`);
}

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
