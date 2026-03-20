import path from 'node:path';

import { buildDirectoryIndexes } from '../index-builder.js';

export async function runBuildIndexCommand(argv: string[]) {
  const args = parseArgs(argv);
  if (!args.root && !args.dir) {
    console.error(
      'Usage: mdorigin build index (--root <content-dir> | --dir <content-dir>)',
    );
    process.exitCode = 1;
    return;
  }

  const result = await buildDirectoryIndexes({
    rootDir: args.root ? path.resolve(args.root) : undefined,
    dir: args.dir ? path.resolve(args.dir) : undefined,
  });

  console.log(`updated ${result.updatedFiles.length} index file(s)`);
  if (result.skippedDirectories.length > 0) {
    console.log(`skipped ${result.skippedDirectories.length} director${result.skippedDirectories.length === 1 ? 'y' : 'ies'} without index.md`);
  }
}

function parseArgs(argv: string[]) {
  const result: { root?: string; dir?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (argument === '--root' && nextValue) {
      result.root = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--dir' && nextValue) {
      result.dir = nextValue;
      index += 1;
    }
  }

  return result;
}
