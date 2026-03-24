#!/usr/bin/env node

import { runBuildIndexCommand } from './build-index.js';
import { runBuildCloudflareCommand } from './build-cloudflare.js';
import { runBuildSearchCommand } from './build-search.js';
import { runDevCommand } from './dev.js';
import { runInitCloudflareCommand } from './init-cloudflare.js';
import { runSearchCommand } from './search.js';

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (command === 'dev') {
    await runDevCommand([subcommand, ...rest].filter(isDefined));
    return;
  }

  if (command === 'build' && subcommand === 'cloudflare') {
    await runBuildCloudflareCommand(rest);
    return;
  }

  if (command === 'build' && subcommand === 'index') {
    await runBuildIndexCommand(rest);
    return;
  }

  if (command === 'build' && subcommand === 'search') {
    await runBuildSearchCommand(rest);
    return;
  }

  if (command === 'init' && subcommand === 'cloudflare') {
    await runInitCloudflareCommand(rest);
    return;
  }

  if (command === 'search') {
    await runSearchCommand([subcommand, ...rest].filter(isDefined));
    return;
  }

  console.error([
    'Usage:',
    '  mdorigin dev --root <content-dir> [--port 3000] [--config mdorigin.config.json] [--search ./dist/search]',
    '  mdorigin build index (--root <content-dir> | --dir <content-dir>)',
    '  mdorigin build search --root <content-dir> [--out ./dist/search] [--config mdorigin.config.json]',
    '  mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config mdorigin.config.json] [--search ./dist/search]',
    '  mdorigin init cloudflare [--dir .] [--entry ./dist/cloudflare/worker.mjs] [--name <worker-name>] [--compatibility-date 2026-03-20] [--force]',
    '  mdorigin search --index <search-dir> [--top-k 10] <query>',
  ].join('\n'));
  process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function isDefined(value: string | undefined): value is string {
  return value !== undefined;
}
