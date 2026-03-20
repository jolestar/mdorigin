import path from 'node:path';

import type {
  ContentDirectoryEntry,
  ContentEntry,
  ContentStore,
} from './content-store.js';
import { parseMarkdownDocument } from './markdown.js';
import { resolveRequest } from './router.js';
import { escapeHtml, renderDocument } from '../html/template.js';

export interface HandleSiteRequestOptions {
  draftMode: 'include' | 'exclude';
}

export interface SiteResponse {
  status: number;
  headers: Record<string, string>;
  body?: string | Uint8Array;
}

export async function handleSiteRequest(
  store: ContentStore,
  pathname: string,
  options: HandleSiteRequestOptions,
): Promise<SiteResponse> {
  const resolved = resolveRequest(pathname);
  if (resolved.kind === 'not-found' || !resolved.sourcePath) {
    return notFound();
  }

  const entry = await store.get(resolved.sourcePath);
  if (entry === null) {
    if (resolved.kind === 'html' && resolved.requestPath.endsWith('/')) {
      return renderDirectoryListing(store, resolved.requestPath);
    }

    return notFound();
  }

  if (resolved.kind === 'asset') {
    return serveAsset(entry);
  }

  if (entry.kind !== 'text' || entry.text === undefined) {
    return notFound();
  }

  if (resolved.kind === 'markdown') {
    const parsed = await parseMarkdownDocument(resolved.sourcePath, entry.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      return notFound();
    }

    return {
      status: 200,
      headers: {
        'content-type': entry.mediaType,
      },
      body: entry.text,
    };
  }

  const parsed = await parseMarkdownDocument(resolved.sourcePath, entry.text);
  if (parsed.meta.draft === true && options.draftMode === 'exclude') {
    return notFound();
  }

  return {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
    body: renderDocument({
      title: getDocumentTitle(parsed),
      body: parsed.html,
      summary: parsed.meta.summary,
      date: parsed.meta.date,
    }),
  };
}

function serveAsset(entry: ContentEntry): SiteResponse {
  if (entry.kind === 'text' && entry.text !== undefined) {
    return {
      status: 200,
      headers: {
        'content-type': entry.mediaType,
      },
      body: entry.text,
    };
  }

  if (entry.kind === 'binary' && entry.bytes !== undefined) {
    return {
      status: 200,
      headers: {
        'content-type': entry.mediaType,
      },
      body: entry.bytes,
    };
  }

  return notFound();
}

function notFound(): SiteResponse {
  return {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
    body: 'Not Found',
  };
}

function getDocumentTitle(parsed: Awaited<ReturnType<typeof parseMarkdownDocument>>): string {
  if (parsed.meta.title) {
    return parsed.meta.title;
  }

  const basename = path.posix.basename(parsed.sourcePath, '.md');
  return basename === 'index'
    ? path.posix.basename(path.posix.dirname(parsed.sourcePath)) || 'mdorigin'
    : basename;
}

async function renderDirectoryListing(
  store: ContentStore,
  requestPath: string,
): Promise<SiteResponse> {
  const directoryPath =
    requestPath === '/' ? '' : requestPath.slice(1).replace(/\/$/, '');
  const entries = await store.listDirectory(directoryPath);
  if (entries === null) {
    return notFound();
  }

  const visibleEntries = entries.filter(isVisibleDirectoryEntry);
  const listItems = visibleEntries
    .map((entry) => `<li><a href="${getDirectoryEntryHref(requestPath, entry)}">${escapeHtml(getDirectoryEntryLabel(entry))}</a></li>`)
    .join('');

  const body = [
    `<h1>${escapeHtml(getDirectoryTitle(requestPath))}</h1>`,
    visibleEntries.length > 0 ? `<ul>${listItems}</ul>` : '<p>This directory is empty.</p>',
  ].join('');

  return {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
    body: renderDocument({
      title: getDirectoryTitle(requestPath),
      body,
    }),
  };
}

function isVisibleDirectoryEntry(entry: ContentDirectoryEntry): boolean {
  if (entry.kind === 'directory') {
    return true;
  }

  return path.posix.extname(entry.name).toLowerCase() === '.md';
}

function getDirectoryEntryHref(
  requestPath: string,
  entry: ContentDirectoryEntry,
): string {
  const basePath = requestPath.endsWith('/') ? requestPath : `${requestPath}/`;
  if (entry.kind === 'directory') {
    return `${basePath}${entry.name}/`;
  }

  return `${basePath}${entry.name.slice(0, -'.md'.length)}`;
}

function getDirectoryEntryLabel(entry: ContentDirectoryEntry): string {
  return entry.kind === 'directory'
    ? `${entry.name}/`
    : entry.name.slice(0, -'.md'.length);
}

function getDirectoryTitle(requestPath: string): string {
  return requestPath === '/' ? 'Index' : requestPath;
}
