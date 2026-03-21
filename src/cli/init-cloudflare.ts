import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { initCloudflareProject } from '../cloudflare.js';

export async function runInitCloudflareCommand(argv: string[]) {
  const args = parseArgs(argv);
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
    force?: boolean;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

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

    if (argument === '--force') {
      result.force = true;
    }
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
