import path from 'node:path';

import { createNodeServer } from '../adapters/node.js';
import { loadSiteConfig } from '../core/site-config.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root) {
    console.error('Usage: npm run dev -- --root <content-dir> [--port 3000]');
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(args.root);
  const port = args.port ?? 3000;
  const siteConfig = await loadSiteConfig({
    cwd: process.cwd(),
    configPath: args.config,
  });
  const server = createNodeServer({
    rootDir,
    draftMode: 'include',
    siteConfig,
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve());
  });

  console.log(`mdorigin dev server listening on http://localhost:${port}`);
  console.log(`content root: ${rootDir}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function parseArgs(argv: string[]) {
  const result: { root?: string; port?: number; config?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--root' && nextValue) {
      result.root = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--port' && nextValue) {
      result.port = Number.parseInt(nextValue, 10);
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
