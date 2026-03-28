import path from 'node:path';

import { createFileSystemContentStore, createNodeServer } from '../adapters/node.js';
import {
  applySiteConfigFrontmatterDefaults,
  loadUserSiteConfig,
} from '../core/site-config.js';
import { createSearchApiFromDirectory } from '../search.js';

export async function runDevCommand(argv: string[]) {
  const args = parseArgs(argv);
  if (!args.root) {
    console.error(
      'Usage: mdorigin dev --root <content-dir> [--port 3000] [--config mdorigin.config.ts] [--search ./dist/search]',
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(args.root);
  const port = args.port ?? 3000;
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
  const server = createNodeServer({
    rootDir,
    draftMode: 'include',
    siteConfig,
    searchApi: args.search
      ? await createSearchApiFromDirectory(path.resolve(args.search))
      : undefined,
    plugins: loadedConfig.plugins,
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve());
  });

  console.log(`mdorigin dev server listening on http://localhost:${port}`);
  console.log(`content root: ${rootDir}`);
}

function parseArgs(argv: string[]) {
  const result: { root?: string; port?: number; config?: string; search?: string } = {};

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
      continue;
    }

    if (argument === '--search' && nextValue) {
      result.search = nextValue;
      index += 1;
    }
  }

  return result;
}
