import path from 'node:path';

import type {
  ContentDirectoryEntry,
  ContentEntry,
  ContentStore,
} from './content-store.js';
import { inferDirectoryContentType } from './content-type.js';
import { getDirectoryIndexCandidates } from './directory-index.js';
import {
  extractManagedIndexEntries,
  getDocumentSummary,
  getDocumentTitle as getParsedDocumentTitle,
  parseMarkdownDocument,
  stripManagedIndexBlock,
  stripManagedIndexLinks,
} from './markdown.js';
import type { ResolvedSiteConfig, SiteNavItem } from './site-config.js';
import { handleApiRoute } from './api.js';
import { normalizeRequestPath, resolveRequest } from './router.js';
import {
  escapeHtml,
  renderCatalogArticleItems,
  renderDocument,
} from '../html/template.js';
import type { SearchApi } from '../search.js';

export interface HandleSiteRequestOptions {
  draftMode: 'include' | 'exclude';
  siteConfig: ResolvedSiteConfig;
  acceptHeader?: string;
  searchParams?: URLSearchParams;
  requestUrl?: string;
  searchApi?: SearchApi;
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
  const searchEnabled = options.searchApi !== undefined;
  const apiRoute = await handleApiRoute(pathname, options.searchParams, {
    searchApi: options.searchApi,
    siteConfig: options.siteConfig,
    requestUrl: options.requestUrl,
  });
  if (apiRoute !== null) {
    return apiRoute;
  }

  if (pathname === '/sitemap.xml') {
    return renderSitemap(store, options);
  }

  const resolved = resolveRequest(pathname);
  const catalogFragmentRequest = getCatalogFragmentRequest(options.searchParams);
  const negotiatedMarkdown = shouldServeMarkdownForRequest(
    resolved,
    options.acceptHeader,
  );
  if (resolved.kind === 'not-found' || !resolved.sourcePath) {
    const aliasRedirect = await tryRedirectAlias(store, pathname, options);
    if (aliasRedirect !== null) {
      return aliasRedirect;
    }

    return notFound();
  }

  const entry = await store.get(resolved.sourcePath);
  if (entry === null) {
    const aliasRedirect = await tryRedirectAlias(store, pathname, options);
    if (aliasRedirect !== null) {
      return aliasRedirect;
    }

    const alternateDirectoryMarkdown = await tryServeAlternateDirectoryMarkdown(
      store,
      resolved,
      options,
      negotiatedMarkdown,
    );
    if (alternateDirectoryMarkdown !== null) {
      return alternateDirectoryMarkdown;
    }

    const alternateMarkdownRedirect = await tryRedirectAlternateDirectoryMarkdown(
      store,
      resolved,
      options,
    );
    if (alternateMarkdownRedirect !== null) {
      return alternateMarkdownRedirect;
    }

    if (resolved.kind === 'html' && resolved.requestPath.endsWith('/')) {
      const directoryIndexResponse = await tryRenderAlternateDirectoryIndex(
        store,
        resolved.requestPath,
        options,
      );
      if (directoryIndexResponse !== null) {
        return directoryIndexResponse;
      }

      return renderDirectoryListing(
        store,
        resolved.requestPath,
        options.siteConfig,
        searchEnabled,
      );
    }

    return notFound();
  }

  if (resolved.kind === 'asset') {
    return serveAsset(entry);
  }

  if (entry.kind !== 'text' || entry.text === undefined) {
    return notFound();
  }

  if (resolved.kind === 'markdown' || negotiatedMarkdown) {
    const parsed = await parseMarkdownDocument(resolved.sourcePath, entry.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      return notFound();
    }

    return {
      status: 200,
      headers: withVaryAcceptIfNeeded(
        {
        'content-type': entry.mediaType,
        },
        negotiatedMarkdown,
      ),
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
      : isRootHomeRequest(resolved.requestPath) && navigation.items.length > 0
        ? stripManagedIndexLinks(
            entry.text,
            new Set(navigation.items.map((item) => item.href)),
          )
      : entry.text;
  const catalogEntries =
    options.siteConfig.template === 'catalog'
      ? extractManagedIndexEntries(renderedBody)
      : [];
  if (
    catalogFragmentRequest !== null &&
    options.siteConfig.template === 'catalog'
  ) {
    return renderCatalogPostsFragment(catalogEntries, catalogFragmentRequest);
  }
  const documentBody =
    options.siteConfig.template === 'catalog'
      ? stripManagedIndexBlock(renderedBody)
      : renderedBody;
  const renderedParsed = documentBody === entry.text
    ? parsed
    : await parseMarkdownDocument(resolved.sourcePath, documentBody);

  return {
    status: 200,
    headers: withVaryAcceptIfNeeded(
      {
      'content-type': 'text/html; charset=utf-8',
      },
      shouldVaryOnAccept(resolved),
    ),
    body: renderDocument({
      siteTitle: options.siteConfig.siteTitle,
      siteDescription: options.siteConfig.siteDescription,
      siteUrl: options.siteConfig.siteUrl,
      favicon: options.siteConfig.favicon,
      logo: options.siteConfig.logo,
      title: getDocumentTitle(parsed),
      body: renderedParsed.html,
      summary:
        options.siteConfig.showSummary === false
          ? undefined
          : getDocumentSummary(parsed.meta, parsed.body),
      date: options.siteConfig.showDate === false ? undefined : parsed.meta.date,
      showSummary: options.siteConfig.showSummary,
      showDate: options.siteConfig.showDate,
      theme: options.siteConfig.theme,
      template: options.siteConfig.template,
      topNav: navigation.items,
      footerNav: options.siteConfig.footerNav,
      footerText: options.siteConfig.footerText,
      socialLinks: options.siteConfig.socialLinks,
      editLinkHref: getEditLinkHref(options.siteConfig, resolved.sourcePath),
      stylesheetContent: options.siteConfig.stylesheetContent,
      canonicalPath: getCanonicalHtmlPathForContentPath(resolved.sourcePath),
      alternateMarkdownPath: getMarkdownRequestPathForContentPath(resolved.sourcePath),
      catalogEntries,
      catalogRequestPath: resolved.requestPath,
      catalogInitialPostCount: options.siteConfig.catalogInitialPostCount,
      catalogLoadMoreStep: options.siteConfig.catalogLoadMoreStep,
      searchEnabled,
    }),
  };
}

interface CatalogFragmentRequest {
  offset: number;
  limit: number;
}

function getCatalogFragmentRequest(
  searchParams: URLSearchParams | undefined,
): CatalogFragmentRequest | null {
  if (searchParams?.get('catalog-format') !== 'posts') {
    return null;
  }

  const offset = normalizeNonNegativeInteger(searchParams.get('catalog-offset'));
  const limit = normalizePositiveInteger(searchParams.get('catalog-limit'));

  if (offset === null || limit === null) {
    return null;
  }

  return { offset, limit };
}

function normalizeNonNegativeInteger(value: string | null): number | null {
  if (value === null) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizePositiveInteger(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function renderCatalogPostsFragment(
  entries: readonly {
    kind: 'directory' | 'article';
    title: string;
    href: string;
    detail?: string;
  }[],
  request: CatalogFragmentRequest,
): SiteResponse {
  const articles = entries.filter((entry) => entry.kind === 'article');
  const visibleArticles = articles.slice(request.offset, request.offset + request.limit);
  const nextOffset = request.offset + visibleArticles.length;

  return {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      itemsHtml: renderCatalogArticleItems(visibleArticles),
      hasMore: nextOffset < articles.length,
      nextOffset,
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

function redirect(location: string): SiteResponse {
  return {
    status: 308,
    headers: {
      location,
    },
  };
}

async function renderSitemap(
  store: ContentStore,
  options: HandleSiteRequestOptions,
): Promise<SiteResponse> {
  if (!options.siteConfig.siteUrl) {
    return {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body: 'sitemap.xml requires siteUrl in mdorigin.config.json',
    };
  }

  const entries = await collectSitemapEntries(store, '', options);
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${escapeHtml(entry.lastmod)}</lastmod>` : '';
      return `  <url><loc>${escapeHtml(`${options.siteConfig.siteUrl}${entry.path}`)}</loc>${lastmod}</url>`;
    }),
    '</urlset>',
  ].join('\n');

  return {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
    },
    body,
  };
}

function withVaryAcceptIfNeeded(
  headers: Record<string, string>,
  enabled: boolean,
): Record<string, string> {
  if (!enabled) {
    return headers;
  }

  return {
    ...headers,
    vary: appendVary(headers.vary, 'Accept'),
  };
}

function appendVary(existing: string | undefined, value: string): string {
  if (!existing || existing.trim() === '') {
    return value;
  }

  const parts = existing.split(',').map((part) => part.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) {
    return existing;
  }

  return `${existing}, ${value}`;
}

function getDocumentTitle(parsed: Awaited<ReturnType<typeof parseMarkdownDocument>>): string {
  const basename = path.posix.basename(parsed.sourcePath, '.md');
  const fallback =
    basename === 'index' || basename === 'README' || basename === 'SKILL'
      ? path.posix.basename(path.posix.dirname(parsed.sourcePath)) || 'mdorigin'
      : basename;
  return getParsedDocumentTitle(parsed.meta, parsed.body, fallback);
}

interface SitemapEntry {
  path: string;
  lastmod?: string;
}

async function collectSitemapEntries(
  store: ContentStore,
  directoryPath: string,
  options: HandleSiteRequestOptions,
): Promise<SitemapEntry[]> {
  const entries = await store.listDirectory(directoryPath);
  if (entries === null) {
    return [];
  }

  const sitemapEntries: SitemapEntry[] = [];

  for (const entry of entries) {
    if (entry.kind === 'directory') {
      sitemapEntries.push(
        ...(await collectSitemapEntries(store, entry.path, options)),
      );
      continue;
    }

    if (!isMarkdownEntry(entry)) {
      continue;
    }

    const document = await store.get(entry.path);
    if (document === null || document.kind !== 'text' || document.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(entry.path, document.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      continue;
    }

    sitemapEntries.push({
      path: getCanonicalHtmlPathForContentPath(entry.path),
      lastmod: parsed.meta.date,
    });
  }

  sitemapEntries.sort((left, right) => left.path.localeCompare(right.path));
  return dedupeSitemapEntries(sitemapEntries);
}

function dedupeSitemapEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const deduped = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    const existing = deduped.get(entry.path);
    if (!existing) {
      deduped.set(entry.path, entry);
      continue;
    }

    if (!existing.lastmod && entry.lastmod) {
      deduped.set(entry.path, entry);
    }
  }

  return Array.from(deduped.values());
}

async function renderDirectoryListing(
  store: ContentStore,
  requestPath: string,
  siteConfig: ResolvedSiteConfig,
  searchEnabled: boolean,
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
      siteUrl: siteConfig.siteUrl,
      favicon: siteConfig.favicon,
      logo: siteConfig.logo,
      title: getDirectoryTitle(requestPath),
      body,
      showSummary: false,
      showDate: false,
      theme: siteConfig.theme,
      template: siteConfig.template,
      topNav: navigation.items,
      footerNav: siteConfig.footerNav,
      footerText: siteConfig.footerText,
      socialLinks: siteConfig.socialLinks,
      stylesheetContent: siteConfig.stylesheetContent,
      canonicalPath: requestPath,
      alternateMarkdownPath: getMarkdownRequestPathForContentPath(
        getDirectoryIndexContentPathForRequestPath(requestPath),
      ),
      searchEnabled,
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

function getDirectoryIndexContentPathForRequestPath(requestPath: string): string {
  return requestPath === '/'
    ? 'index.md'
    : `${requestPath.slice(1).replace(/\/$/, '')}/index.md`;
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
        : isRootHomeRequest(requestPath) && navigation.items.length > 0
          ? stripManagedIndexLinks(
              entry.text,
              new Set(navigation.items.map((item) => item.href)),
            )
        : entry.text;
    const catalogEntries =
      options.siteConfig.template === 'catalog'
        ? extractManagedIndexEntries(renderedBody)
        : [];
    const catalogFragmentRequest = getCatalogFragmentRequest(options.searchParams);
    if (
      catalogFragmentRequest !== null &&
      options.siteConfig.template === 'catalog'
    ) {
      return renderCatalogPostsFragment(catalogEntries, catalogFragmentRequest);
    }
    const documentBody =
      options.siteConfig.template === 'catalog'
        ? stripManagedIndexBlock(renderedBody)
        : renderedBody;
    const renderedParsed = documentBody === entry.text
      ? parsed
      : await parseMarkdownDocument(candidatePath, documentBody);

    return {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
      body: renderDocument({
        siteTitle: options.siteConfig.siteTitle,
        siteDescription: options.siteConfig.siteDescription,
        siteUrl: options.siteConfig.siteUrl,
        favicon: options.siteConfig.favicon,
        logo: options.siteConfig.logo,
        title: getDocumentTitle(parsed),
        body: renderedParsed.html,
        summary:
          options.siteConfig.showSummary === false
            ? undefined
            : getDocumentSummary(parsed.meta, parsed.body),
        date: options.siteConfig.showDate === false ? undefined : parsed.meta.date,
        showSummary: options.siteConfig.showSummary,
        showDate: options.siteConfig.showDate,
        theme: options.siteConfig.theme,
        template: options.siteConfig.template,
        topNav: navigation.items,
        footerNav: options.siteConfig.footerNav,
        footerText: options.siteConfig.footerText,
        socialLinks: options.siteConfig.socialLinks,
        editLinkHref: getEditLinkHref(options.siteConfig, candidatePath),
        stylesheetContent: options.siteConfig.stylesheetContent,
        canonicalPath: requestPath,
        alternateMarkdownPath: getMarkdownRequestPathForContentPath(candidatePath),
        catalogEntries,
        catalogRequestPath: requestPath,
        catalogInitialPostCount: options.siteConfig.catalogInitialPostCount,
        catalogLoadMoreStep: options.siteConfig.catalogLoadMoreStep,
        searchEnabled: options.searchApi !== undefined,
      }),
    };
  }

  return null;
}

async function tryServeAlternateDirectoryMarkdown(
  store: ContentStore,
  resolved: ReturnType<typeof resolveRequest>,
  options: HandleSiteRequestOptions,
  negotiatedMarkdown: boolean,
): Promise<SiteResponse | null> {
  if (!negotiatedMarkdown || resolved.kind !== 'html' || !resolved.sourcePath) {
    return null;
  }

  if (!resolved.requestPath.endsWith('/')) {
    return null;
  }

  const directoryPath = path.posix.dirname(resolved.sourcePath);
  for (const candidatePath of getDirectoryIndexCandidates(
    directoryPath === '.' ? '' : directoryPath,
  )) {
    if (candidatePath === resolved.sourcePath) {
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

    return {
      status: 200,
      headers: withVaryAcceptIfNeeded(
        {
          'content-type': entry.mediaType,
        },
        true,
      ),
      body: entry.text,
    };
  }

  return null;
}

async function tryRedirectAlternateDirectoryMarkdown(
  store: ContentStore,
  resolved: ReturnType<typeof resolveRequest>,
  options: HandleSiteRequestOptions,
): Promise<SiteResponse | null> {
  if (resolved.kind !== 'markdown' || !resolved.sourcePath) {
    return null;
  }

  const basename = path.posix.basename(resolved.sourcePath);
  if (basename !== 'index.md' && basename !== 'README.md') {
    return null;
  }

  const directoryPath = path.posix.dirname(resolved.sourcePath);
  for (const candidatePath of getDirectoryIndexCandidates(
    directoryPath === '.' ? '' : directoryPath,
  )) {
    if (candidatePath === resolved.sourcePath) {
      continue;
    }

    const entry = await store.get(candidatePath);
    if (entry === null || entry.kind !== 'text' || entry.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(candidatePath, entry.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      return null;
    }

    return redirect(getMarkdownRequestPathForContentPath(candidatePath));
  }

  return null;
}

function getMarkdownRequestPathForContentPath(contentPath: string): string {
  return `/${contentPath}`;
}

function isRootHomeRequest(requestPath: string): boolean {
  return requestPath === '/';
}

function shouldServeMarkdownForRequest(
  resolved: ReturnType<typeof resolveRequest>,
  acceptHeader: string | undefined,
): boolean {
  return shouldVaryOnAccept(resolved) && acceptsMarkdown(acceptHeader);
}

function shouldVaryOnAccept(
  resolved: ReturnType<typeof resolveRequest>,
): boolean {
  if (resolved.kind !== 'html') {
    return false;
  }

  return !resolved.requestPath.endsWith('.html');
}

function acceptsMarkdown(acceptHeader: string | undefined): boolean {
  if (!acceptHeader) {
    return false;
  }

  return acceptHeader
    .split(',')
    .map((part) => part.split(';', 1)[0]?.trim().toLowerCase())
    .includes('text/markdown');
}

async function tryRedirectAlias(
  store: ContentStore,
  pathname: string,
  options: HandleSiteRequestOptions,
): Promise<SiteResponse | null> {
  const normalizedRequestPath = normalizeRequestPath(pathname);
  if (normalizedRequestPath === null) {
    return null;
  }

  const redirectLocation = await findAliasRedirectLocation(
    store,
    '',
    normalizedRequestPath,
    options,
  );
  if (!redirectLocation || redirectLocation === normalizedRequestPath) {
    return null;
  }

  return redirect(redirectLocation);
}

async function findAliasRedirectLocation(
  store: ContentStore,
  directoryPath: string,
  requestPath: string,
  options: HandleSiteRequestOptions,
): Promise<string | null> {
  const entries = await store.listDirectory(directoryPath);
  if (entries === null) {
    return null;
  }

  for (const entry of entries) {
    if (entry.kind === 'directory') {
      const nestedMatch = await findAliasRedirectLocation(
        store,
        entry.path,
        requestPath,
        options,
      );
      if (nestedMatch !== null) {
        return nestedMatch;
      }
      continue;
    }

    if (!isMarkdownEntry(entry)) {
      continue;
    }

    const document = await store.get(entry.path);
    if (document === null || document.kind !== 'text' || document.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(entry.path, document.text);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      continue;
    }

    const aliases = normalizeAliases(parsed.meta.aliases);
    if (!aliases.includes(requestPath)) {
      continue;
    }

    return getCanonicalHtmlPathForContentPath(entry.path);
  }

  return null;
}

function isMarkdownEntry(entry: ContentDirectoryEntry): boolean {
  return path.posix.extname(entry.name).toLowerCase() === '.md';
}

function normalizeAliases(aliases: unknown): string[] {
  if (!Array.isArray(aliases)) {
    return [];
  }

  return aliases.flatMap((alias) => {
    if (typeof alias !== 'string') {
      return [];
    }

    const normalized = normalizeRequestPath(alias);
    return normalized === null ? [] : [normalized];
  });
}

function getCanonicalHtmlPathForContentPath(contentPath: string): string {
  const basename = path.posix.basename(contentPath).toLowerCase();
  if (basename === 'index.md' || basename === 'readme.md') {
    const directory = path.posix.dirname(contentPath);
    return directory === '.' ? '/' : `/${directory}/`;
  }

  return `/${contentPath.slice(0, -'.md'.length)}`;
}

function getEditLinkHref(
  siteConfig: ResolvedSiteConfig,
  sourcePath: string | undefined,
): string | undefined {
  if (!siteConfig.editLink || !sourcePath) {
    return undefined;
  }

  return `${siteConfig.editLink.baseUrl}${sourcePath}`;
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
  const orderedNavItems: Array<SiteNavItem & { order?: number }> = [];

  for (const entry of directories) {
    const resolved = await resolveDirectoryNav(store, entry);
    if (resolved.type !== 'page') {
      continue;
    }

    orderedNavItems.push({
      label: resolved.title,
      href: `/${entry.name}/`,
      order: resolved.order,
    });
  }

  orderedNavItems.sort((left, right) => {
    if (left.order !== undefined && right.order !== undefined) {
      if (left.order !== right.order) {
        return left.order - right.order;
      }
    } else if (left.order !== undefined) {
      return -1;
    } else if (right.order !== undefined) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });

  navItems.push(...orderedNavItems.map(({ label, href }) => ({ label, href })));

  return {
    items: navItems,
    autoGenerated: navItems.length > 0,
  };
}

async function resolveDirectoryNav(
  store: ContentStore,
  entry: ContentDirectoryEntry,
): Promise<{ title: string; type: 'page' | 'post'; order?: number }> {
  for (const candidatePath of getDirectoryIndexCandidates(entry.path)) {
    const contentEntry = await store.get(candidatePath);
    if (contentEntry === null || contentEntry.kind !== 'text' || contentEntry.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(candidatePath, contentEntry.text);
    const shape = await inspectDirectoryShape(store, entry.path);

    return {
      title: getParsedDocumentTitle(parsed.meta, parsed.body, entry.name),
      type: inferDirectoryContentType(parsed.meta, shape),
      order: parsed.meta.order,
    };
  }

  return {
    title: entry.name,
    type: 'page',
  };
}

async function inspectDirectoryShape(
  store: ContentStore,
  directoryPath: string,
): Promise<{
  hasSkillIndex: boolean;
  hasChildDirectories: boolean;
  hasExtraMarkdownFiles: boolean;
  hasAssetFiles: boolean;
}> {
  const entries = await store.listDirectory(directoryPath);
  if (entries === null) {
    return {
      hasSkillIndex: false,
      hasChildDirectories: false,
      hasExtraMarkdownFiles: false,
      hasAssetFiles: false,
    };
  }

  let hasSkillIndex = false;
  let hasChildDirectories = false;
  let hasExtraMarkdownFiles = false;
  let hasAssetFiles = false;

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.kind === 'directory') {
      hasChildDirectories = true;
      continue;
    }

    const extension = path.posix.extname(entry.name).toLowerCase();
    if (extension === '.md') {
      if (entry.name === 'SKILL.md') {
        hasSkillIndex = true;
      } else if (entry.name !== 'index.md' && entry.name !== 'README.md') {
        hasExtraMarkdownFiles = true;
      }
      continue;
    }

    hasAssetFiles = true;
  }

  return {
    hasSkillIndex,
    hasChildDirectories,
    hasExtraMarkdownFiles,
    hasAssetFiles,
  };
}
