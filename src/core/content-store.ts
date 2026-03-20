import path from 'node:path';

export type ContentEntryKind = 'text' | 'binary';

export interface ContentEntry {
  path: string;
  kind: ContentEntryKind;
  mediaType: string;
  text?: string;
  bytes?: Uint8Array;
}

export interface ContentDirectoryEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
}

export interface ContentStore {
  get(contentPath: string): Promise<ContentEntry | null>;
  listDirectory(contentPath: string): Promise<ContentDirectoryEntry[] | null>;
}

export class MemoryContentStore implements ContentStore {
  private readonly entries: Map<string, ContentEntry>;

  constructor(entries: Iterable<ContentEntry>) {
    this.entries = new Map(
      Array.from(entries, (entry) => [entry.path, { ...entry }]),
    );
  }

  async get(contentPath: string): Promise<ContentEntry | null> {
    return this.entries.get(contentPath) ?? null;
  }

  async listDirectory(contentPath: string): Promise<ContentDirectoryEntry[] | null> {
    const directoryPath = normalizeDirectoryPath(contentPath);
    if (directoryPath === null) {
      return null;
    }

    const prefix = directoryPath === '' ? '' : `${directoryPath}/`;
    const children = new Map<string, ContentDirectoryEntry>();

    for (const entryPath of this.entries.keys()) {
      if (!entryPath.startsWith(prefix)) {
        continue;
      }

      const remainder = entryPath.slice(prefix.length);
      if (remainder === '') {
        continue;
      }

      const [firstSegment, ...rest] = remainder.split('/');
      if (firstSegment.startsWith('.')) {
        continue;
      }

      if (rest.length === 0) {
        children.set(firstSegment, {
          name: firstSegment,
          path: prefix + firstSegment,
          kind: 'file',
        });
        continue;
      }

      children.set(firstSegment, {
        name: firstSegment,
        path: prefix + firstSegment,
        kind: 'directory',
      });
    }

    const entries = Array.from(children.values()).sort(compareDirectoryEntries);
    return entries.length > 0 || directoryPath === '' ? entries : null;
  }
}

const MEDIA_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

export function getMediaTypeForPath(contentPath: string): string {
  const extension = path.posix.extname(contentPath).toLowerCase();
  return MEDIA_TYPES.get(extension) ?? 'application/octet-stream';
}

export function isLikelyTextPath(contentPath: string): boolean {
  const mediaType = getMediaTypeForPath(contentPath);
  return (
    mediaType.startsWith('text/') ||
    mediaType === 'application/json; charset=utf-8' ||
    mediaType === 'image/svg+xml'
  );
}

export function normalizeContentPath(inputPath: string): string | null {
  const normalized = inputPath.replace(/\\/g, '/');
  const withoutLeadingSlash = normalized.replace(/^\/+/, '');
  const resolved = path.posix.normalize(withoutLeadingSlash);

  if (
    resolved === '' ||
    resolved === '.' ||
    resolved.startsWith('../') ||
    resolved.includes('/../')
  ) {
    return null;
  }

  return resolved;
}

export function normalizeDirectoryPath(inputPath: string): string | null {
  if (inputPath === '') {
    return '';
  }

  return normalizeContentPath(inputPath);
}

function compareDirectoryEntries(
  left: ContentDirectoryEntry,
  right: ContentDirectoryEntry,
): number {
  if (left.kind !== right.kind) {
    return left.kind === 'directory' ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}
