import { runBuildCloudflareCommand } from './build-cloudflare.js';
import { runDevCommand } from './dev.js';
import { runInitCloudflareCommand } from './init-cloudflare.js';

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (command === 'dev') {
    await runDevCommand(rest);
    return;
  }

  if (command === 'build' && subcommand === 'cloudflare') {
    await runBuildCloudflareCommand(rest);
    return;
  }

  if (command === 'init' && subcommand === 'cloudflare') {
    await runInitCloudflareCommand(rest);
    return;
  }

  console.error([
    'Usage:',
    '  mdorigin dev --root <content-dir> [--port 3000] [--config mdorigin.config.json]',
    '  mdorigin build cloudflare --root <content-dir> [--out ./.mdorigin/cloudflare] [--config mdorigin.config.json]',
    '  mdorigin init cloudflare [--dir .] [--entry ./.mdorigin/cloudflare/worker.mjs] [--name mdorigin-site] [--compatibility-date 2026-03-20] [--force]',
  ].join('\n'));
  process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
