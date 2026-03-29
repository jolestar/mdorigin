#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runBuildIndexCommand } from './build-index.js';
import { runBuildCloudflareCommand } from './build-cloudflare.js';
import { runBuildSearchCommand } from './build-search.js';
import { runDevCommand } from './dev.js';
import { BUILD_USAGE_LINES, INIT_USAGE_LINES, ROOT_USAGE_LINES, printUsage } from './help.js';
import { runInitCloudflareCommand } from './init-cloudflare.js';
import { runSearchCommand } from './search.js';
import { runSyncCloudflareR2Command } from './sync-cloudflare-r2.js';

async function main() {
  const argv = process.argv.slice(2);
  const [command, subcommand, ...rest] = argv;

  if (argv.length === 0 || command === 'help' || command === '--help' || command === '-h') {
    if (command === 'help' && subcommand === 'build') {
      printUsage(BUILD_USAGE_LINES);
      return;
    }

    if (command === 'help' && subcommand === 'init') {
      printUsage(INIT_USAGE_LINES);
      return;
    }

    printUsage(ROOT_USAGE_LINES);
    return;
  }

  if (command === '--version' || command === '-V' || command === 'version') {
    console.log(getCliVersion());
    return;
  }

  if (command === 'dev') {
    await runDevCommand([subcommand, ...rest].filter(isDefined));
    return;
  }

  if (command === 'build' && (subcommand === '--help' || subcommand === '-h' || !subcommand)) {
    printUsage(BUILD_USAGE_LINES, subcommand === undefined);
    process.exitCode = subcommand === undefined ? 1 : 0;
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

  if (command === 'init' && (subcommand === '--help' || subcommand === '-h' || !subcommand)) {
    printUsage(INIT_USAGE_LINES, subcommand === undefined);
    process.exitCode = subcommand === undefined ? 1 : 0;
    return;
  }

  if (command === 'search') {
    await runSearchCommand([subcommand, ...rest].filter(isDefined));
    return;
  }

  if (command === 'sync' && subcommand === 'cloudflare-r2') {
    await runSyncCloudflareR2Command(rest);
    return;
  }

  console.error(`Unknown command: ${argv.join(' ')}`);
  printUsage(ROOT_USAGE_LINES, true);
  process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function isDefined(value: string | undefined): value is string {
  return value !== undefined;
}

function getCliVersion(): string {
  const packageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'package.json',
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}
