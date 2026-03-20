import path from 'node:path';

export const DIRECTORY_INDEX_FILENAMES = ['index.md', 'README.md'] as const;

export function getDirectoryIndexCandidates(directoryPath: string): string[] {
  return DIRECTORY_INDEX_FILENAMES.map((filename) =>
    directoryPath === '' ? filename : path.posix.join(directoryPath, filename),
  );
}
