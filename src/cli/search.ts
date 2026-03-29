import path from 'node:path';

import { searchBundle } from '../search.js';

export async function runSearchCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  if (args.help) {
    console.log(
      'Usage: mdorigin search --index <search-dir> [--top-k 10] [--meta key=value] <query>',
    );
    return;
  }
  if (!args.indexDir || !args.query) {
    throw new Error(
      'Usage: mdorigin search --index <search-dir> [--top-k 10] [--meta key=value] <query>',
    );
  }

  const hits = await searchBundle({
    indexDir: path.resolve(args.indexDir),
    query: args.query,
    topK: args.topK,
    metadata: args.metadata,
  });

  console.log(JSON.stringify(hits, null, 2));
}

function parseArgs(rawArgs: string[]) {
  const flags: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  const positionals: string[] = [];
  const supportedFlags = new Set(['index', 'top-k', 'meta']);

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--help' || arg === '-h') {
      flags.help = 'true';
      continue;
    }
    if (arg.startsWith('--')) {
      const flag = arg.slice(2);
      if (!supportedFlags.has(flag)) {
        throw new Error(`Unknown argument for mdorigin search: ${arg}`);
      }

      const value = rawArgs[index + 1];
      if (value && !value.startsWith('--')) {
        if (flag === 'meta') {
          const separator = value.indexOf('=');
          if (separator <= 0 || separator === value.length - 1) {
            throw new Error(`Invalid value for --meta: ${value}`);
          }
          metadata[value.slice(0, separator)] = value.slice(separator + 1);
        } else {
          flags[flag] = value;
        }
        index += 1;
        continue;
      }

      throw new Error(`Incomplete argument for mdorigin search: ${arg}`);
    }

    positionals.push(arg);
  }

  const topK = flags['top-k'] ? Number.parseInt(flags['top-k'], 10) : undefined;

  return {
    indexDir: flags.index,
    topK: Number.isInteger(topK) && topK! > 0 ? topK : undefined,
    query: positionals.join(' ').trim(),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    help: flags.help === 'true',
  };
}
