import path from 'node:path';

import { searchBundle } from '../search.js';

export async function runSearchCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  if (args.help) {
    console.log('Usage: mdorigin search --index <search-dir> [--top-k 10] <query>');
    return;
  }
  if (!args.indexDir || !args.query) {
    throw new Error(
      'Usage: mdorigin search --index <search-dir> [--top-k 10] <query>',
    );
  }

  const hits = await searchBundle({
    indexDir: path.resolve(args.indexDir),
    query: args.query,
    topK: args.topK,
  });

  console.log(JSON.stringify(hits, null, 2));
}

function parseArgs(rawArgs: string[]) {
  const flags: Record<string, string> = {};
  const positionals: string[] = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--help' || arg === '-h') {
      flags.help = 'true';
      continue;
    }
    if (arg.startsWith('--')) {
      const value = rawArgs[index + 1];
      if (value && !value.startsWith('--')) {
        flags[arg.slice(2)] = value;
        index += 1;
        continue;
      }

      throw new Error(`Unknown or incomplete argument for mdorigin search: ${arg}`);
    }

    positionals.push(arg);
  }

  const topK = flags['top-k'] ? Number.parseInt(flags['top-k'], 10) : undefined;

  return {
    indexDir: flags.index,
    topK: Number.isInteger(topK) && topK! > 0 ? topK : undefined,
    query: positionals.join(' ').trim(),
    help: flags.help === 'true',
  };
}
