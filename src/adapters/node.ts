import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { ContentEntry, ContentStore } from '../core/content-store.js';
import {
  getMediaTypeForPath,
  isLikelyTextPath,
  normalizeContentPath,
  normalizeDirectoryPath,
  type ContentDirectoryEntry,
} from '../core/content-store.js';
import { handleSiteRequest } from '../core/request-handler.js';
import type { ResolvedSiteConfig } from '../core/site-config.js';

export interface NodeAdapterOptions {
  rootDir: string;
  draftMode: 'include' | 'exclude';
  siteConfig: ResolvedSiteConfig;
}

export function createFileSystemContentStore(rootDir: string): ContentStore {
  const resolvedRootDir = path.resolve(rootDir);

  return {
    async get(contentPath: string): Promise<ContentEntry | null> {
      const normalizedPath = normalizeContentPath(contentPath);
      if (normalizedPath === null) {
        return null;
      }

      const filePath = path.resolve(resolvedRootDir, normalizedPath);
      if (!filePath.startsWith(`${resolvedRootDir}${path.sep}`) && filePath !== resolvedRootDir) {
        return null;
      }

      try {
        const mediaType = getMediaTypeForPath(normalizedPath);
        if (isLikelyTextPath(normalizedPath)) {
          const text = await readFile(filePath, 'utf8');
          return {
            path: normalizedPath,
            kind: 'text',
            mediaType,
            text,
          };
        }

        const bytes = new Uint8Array(await readFile(filePath));
        return {
          path: normalizedPath,
          kind: 'binary',
          mediaType,
          bytes,
        };
      } catch (error) {
        if (isNodeNotFound(error)) {
          return null;
        }

        throw error;
      }
    },
    async listDirectory(contentPath: string): Promise<ContentDirectoryEntry[] | null> {
      const normalizedPath = normalizeDirectoryPath(contentPath);
      if (normalizedPath === null) {
        return null;
      }

      const directoryPath = path.resolve(resolvedRootDir, normalizedPath);
      if (
        !directoryPath.startsWith(`${resolvedRootDir}${path.sep}`) &&
        directoryPath !== resolvedRootDir
      ) {
        return null;
      }

      try {
        const entries = await readdir(directoryPath, { withFileTypes: true });
        return entries
          .filter((entry) => !entry.name.startsWith('.'))
          .map(
            (entry): ContentDirectoryEntry => ({
              name: entry.name,
              path:
                normalizedPath === ''
                  ? entry.name
                  : `${normalizedPath}/${entry.name}`,
              kind: entry.isDirectory() ? 'directory' : 'file',
            }),
          )
          .sort((left, right) => {
            if (left.kind !== right.kind) {
              return left.kind === 'directory' ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
          });
      } catch (error) {
        if (isNodeNotFound(error)) {
          return null;
        }

        throw error;
      }
    },
  };
}

export function createNodeRequestListener(options: NodeAdapterOptions) {
  const store = createFileSystemContentStore(options.rootDir);

  return async function onRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const siteResponse = await handleSiteRequest(store, url.pathname, {
        draftMode: options.draftMode,
        siteConfig: options.siteConfig,
        acceptHeader: request.headers.accept,
      });

      response.statusCode = siteResponse.status;
      for (const [headerName, headerValue] of Object.entries(siteResponse.headers)) {
        response.setHeader(headerName, headerValue);
      }

      if (siteResponse.body instanceof Uint8Array) {
        response.end(Buffer.from(siteResponse.body));
        return;
      }

      response.end(siteResponse.body ?? '');
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('content-type', 'text/plain; charset=utf-8');
      response.end(
        error instanceof Error ? error.message : 'Unexpected server error',
      );
    }
  };
}

export function createNodeServer(options: NodeAdapterOptions) {
  return createServer(createNodeRequestListener(options));
}

function isNodeNotFound(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
