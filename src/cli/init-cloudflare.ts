import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { initCloudflareProject } from '../cloudflare.js';

export async function runInitCloudflareCommand(argv: string[]) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      'Usage: mdorigin init cloudflare [--dir .] [--entry ./dist/cloudflare/worker.mjs] [--name <worker-name>] [--compatibility-date 2026-03-20] [--r2-bucket <bucket-name>] [--force]',
    );
    return;
  }
  const projectDir = path.resolve(args.dir ?? '.');
  const workerEntry = path.resolve(
    projectDir,
    args.entry ?? 'dist/cloudflare/worker.mjs',
  );
  const siteTitle = args.name ? undefined : await inferSiteTitleFromWorkerEntry(workerEntry);

  const result = await initCloudflareProject({
    projectDir,
    workerEntry,
    workerName: args.name,
    siteTitle,
    compatibilityDate: args.compatibilityDate,
    r2Bucket: args.r2Bucket,
    force: args.force,
  });

  console.log(`wrangler config written to ${result.configFile}`);
}

function parseArgs(argv: string[]) {
  const result: {
    dir?: string;
    entry?: string;
    name?: string;
    compatibilityDate?: string;
    r2Bucket?: string;
    force?: boolean;
    help?: boolean;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }

    if (argument === '--dir' && nextValue) {
      result.dir = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--entry' && nextValue) {
      result.entry = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--name' && nextValue) {
      result.name = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--compatibility-date' && nextValue) {
      result.compatibilityDate = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--r2-bucket' && nextValue) {
      result.r2Bucket = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--force') {
      result.force = true;
      continue;
    }

    throw new Error(`Unknown argument for mdorigin init cloudflare: ${argument}`);
  }

  return result;
}

async function inferSiteTitleFromWorkerEntry(
  workerEntry: string,
): Promise<string | undefined> {
  try {
    const source = await readFile(workerEntry, 'utf8');
    const match = source.match(/"siteTitle":\s*"([^"]+)"/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
