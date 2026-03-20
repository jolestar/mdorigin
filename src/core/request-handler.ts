import path from 'node:path';

import type {
  ContentDirectoryEntry,
  ContentEntry,
  ContentStore,
} from './content-store.js';
import { getDirectoryIndexCandidates } from './directory-index.js';
import {
  parseMarkdownDocument,
  stripManagedIndexBlock,
} from './markdown.js';
import type { ResolvedSiteConfig, SiteNavItem } from './site-config.js';
import { resolveRequest } from './router.js';
import { escapeHtml, renderDocument } from '../html/template.js';

export interface HandleSiteRequestOptions {
  draftMode: 'include' | 'exclude';
  siteConfig: ResolvedSiteConfig;
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
      const directoryIndexResponse = await tryRenderAlternateDirectoryIndex(
        store,
        resolved.requestPath,
        options,
      );
      if (directoryIndexResponse !== null) {
        return directoryIndexResponse;
      }

      return renderDirectoryListing(store, resolved.requestPath, options.siteConfig);
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
  const navigation = await resolveTopNav(store, options.siteConfig);

  const renderedBody =
    isRootHomeRequest(resolved.requestPath) && !options.siteConfig.showHomeIndex
      ? stripManagedIndexBlock(entry.text)
      : entry.text;
  const renderedParsed = renderedBody === entry.text
    ? parsed
    : await parseMarkdownDocument(resolved.sourcePath, renderedBody);

  return {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
    body: renderDocument({
      siteTitle: options.siteConfig.siteTitle,
      siteDescription: options.siteConfig.siteDescription,
      title: getDocumentTitle(parsed),
      body: renderedParsed.html,
      summary:
        options.siteConfig.showSummary === false ? undefined : parsed.meta.summary,
      date: options.siteConfig.showDate === false ? undefined : parsed.meta.date,
      showSummary: options.siteConfig.showSummary,
      showDate: options.siteConfig.showDate,
      theme: options.siteConfig.theme,
      topNav: navigation.items,
      stylesheetContent: options.siteConfig.stylesheetContent,
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
  siteConfig: ResolvedSiteConfig,
): Promise<SiteResponse> {
  const directoryPath =
    requestPath === '/' ? '' : requestPath.slice(1).replace(/\/$/, '');
  const entries = await store.listDirectory(directoryPath);
  if (entries === null) {
    return notFound();
  }

  const visibleEntries = entries.filter(isVisibleDirectoryEntry);
  const navigation = await resolveTopNav(store, siteConfig);
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
      siteTitle: siteConfig.siteTitle,
      siteDescription: siteConfig.siteDescription,
      title: getDirectoryTitle(requestPath),
      body,
      showSummary: false,
      showDate: false,
      theme: siteConfig.theme,
      topNav: navigation.items,
      stylesheetContent: siteConfig.stylesheetContent,
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

async function tryRenderAlternateDirectoryIndex(
  store: ContentStore,
  requestPath: string,
  options: HandleSiteRequestOptions,
): Promise<SiteResponse | null> {
  const directoryPath =
    requestPath === '/' ? '' : requestPath.slice(1).replace(/\/$/, '');

  for (const candidatePath of getDirectoryIndexCandidates(directoryPath)) {
    if (candidatePath === (directoryPath === '' ? 'index.md' : `${directoryPath}/index.md`)) {
      continue;
    }

    const entry = await store.get(candidatePath);
    if (entry === null || entry.kind !== 'text' || entry.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(candidatePath, entry.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      return notFound();
    }
    const navigation = await resolveTopNav(store, options.siteConfig);
    const renderedBody =
      isRootHomeRequest(requestPath) && !options.siteConfig.showHomeIndex
        ? stripManagedIndexBlock(entry.text)
        : entry.text;
    const renderedParsed = renderedBody === entry.text
      ? parsed
      : await parseMarkdownDocument(candidatePath, renderedBody);

    return {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
      body: renderDocument({
        siteTitle: options.siteConfig.siteTitle,
        siteDescription: options.siteConfig.siteDescription,
        title: getDocumentTitle(parsed),
        body: renderedParsed.html,
        summary:
          options.siteConfig.showSummary === false ? undefined : parsed.meta.summary,
        date: options.siteConfig.showDate === false ? undefined : parsed.meta.date,
        showSummary: options.siteConfig.showSummary,
        showDate: options.siteConfig.showDate,
        theme: options.siteConfig.theme,
        topNav: navigation.items,
        stylesheetContent: options.siteConfig.stylesheetContent,
      }),
    };
  }

  return null;
}

function isRootHomeRequest(requestPath: string): boolean {
  return requestPath === '/';
}

async function resolveTopNav(
  store: ContentStore,
  siteConfig: ResolvedSiteConfig,
): Promise<{ items: SiteNavItem[]; autoGenerated: boolean }> {
  if (siteConfig.topNav.length > 0) {
    return {
      items: siteConfig.topNav,
      autoGenerated: false,
    };
  }

  const rootEntries = await store.listDirectory('');
  if (rootEntries === null) {
    return {
      items: [],
      autoGenerated: false,
    };
  }

  const directories = rootEntries.filter((entry) => entry.kind === 'directory');
  const navItems: SiteNavItem[] = [];

  for (const entry of directories) {
    const title = await resolveDirectoryNavTitle(store, entry);
    navItems.push({
      label: title,
      href: `/${entry.name}/`,
    });
  }

  return {
    items: navItems,
    autoGenerated: navItems.length > 0,
  };
}

async function resolveDirectoryNavTitle(
  store: ContentStore,
  entry: ContentDirectoryEntry,
): Promise<string> {
  for (const candidatePath of getDirectoryIndexCandidates(entry.path)) {
    const contentEntry = await store.get(candidatePath);
    if (contentEntry === null || contentEntry.kind !== 'text' || contentEntry.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(candidatePath, contentEntry.text);
    if (typeof parsed.meta.title === 'string' && parsed.meta.title !== '') {
      return parsed.meta.title;
    }
  }

  return entry.name;
}
