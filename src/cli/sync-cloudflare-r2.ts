import path from 'node:path';

import { syncCloudflareR2 } from '../cloudflare.js';

export async function runSyncCloudflareR2Command(argv: string[]) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      'Usage: mdorigin sync cloudflare-r2 --dir ./dist/cloudflare --bucket <bucket-name> [--force]',
    );
    return;
  }

  if (!args.bucket) {
    console.error(
      'Usage: mdorigin sync cloudflare-r2 --dir ./dist/cloudflare --bucket <bucket-name> [--force]',
    );
    process.exitCode = 1;
    return;
  }

  const result = await syncCloudflareR2({
    dir: path.resolve(args.dir ?? 'dist/cloudflare'),
    bucketName: args.bucket,
    force: args.force,
  });
  console.log(
    `synced ${result.uploadedCount} R2 object(s), skipped ${result.skippedCount}, state written to ${result.stateFile}`,
  );
}

function parseArgs(argv: string[]) {
  const result: {
    dir?: string;
    bucket?: string;
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

    if (argument === '--bucket' && nextValue) {
      result.bucket = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--force') {
      result.force = true;
      continue;
    }

    throw new Error(`Unknown argument for mdorigin sync cloudflare-r2: ${argument}`);
  }

  return result;
}
