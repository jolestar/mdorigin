export const ROOT_USAGE_LINES = [
  'Usage:',
  '  mdorigin dev --root <content-dir> [--port 3000] [--config <config-file>] [--search ./dist/search]',
  '  mdorigin build index (--root <content-dir> | --dir <content-dir>) [--config <config-file>]',
  '  mdorigin build search --root <content-dir> [--out ./dist/search] [--embedding-backend model2vec|hashing] [--model sentence-transformers/all-MiniLM-L6-v2] [--config <config-file>]',
  '  mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search]',
  '  mdorigin init cloudflare [--dir .] [--entry ./dist/cloudflare/worker.mjs] [--name <worker-name>] [--compatibility-date 2026-03-20] [--force]',
  '  mdorigin search --index <search-dir> [--top-k 10] <query>',
  '',
  'Global options:',
  '  -h, --help     Show help',
  '  -V, --version  Show version',
];

export const BUILD_USAGE_LINES = [
  'Usage:',
  '  mdorigin build index (--root <content-dir> | --dir <content-dir>) [--config <config-file>]',
  '  mdorigin build search --root <content-dir> [--out ./dist/search] [--embedding-backend model2vec|hashing] [--model sentence-transformers/all-MiniLM-L6-v2] [--config <config-file>]',
  '  mdorigin build cloudflare --root <content-dir> [--out ./dist/cloudflare] [--config <config-file>] [--search ./dist/search]',
];

export const INIT_USAGE_LINES = [
  'Usage:',
  '  mdorigin init cloudflare [--dir .] [--entry ./dist/cloudflare/worker.mjs] [--name <worker-name>] [--compatibility-date 2026-03-20] [--force]',
];

export function printUsage(lines: readonly string[], error = false): void {
  const output = lines.join('\n');
  if (error) {
    console.error(output);
    return;
  }

  console.log(output);
}
