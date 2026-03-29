import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { inferDirectoryContentType } from './core/content-type.js';
import { getDirectoryIndexCandidates } from './core/directory-index.js';
import {
  getDocumentSummary,
  getDocumentTitle,
  parseMarkdownDocument,
} from './core/markdown.js';
import type { ParsedDocumentMeta } from './core/markdown.js';
import { isIgnoredContentName } from './core/content-store.js';
import type { ResolvedSiteConfig } from './core/site-config.js';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface IndexbindBuildDocument {
  docId?: string;
  sourcePath?: string;
  relativePath: string;
  canonicalUrl?: string;
  title?: string;
  summary?: string;
  content: string;
  metadata?: Record<string, JsonValue>;
}

interface IndexbindBuildModule {
  buildCanonicalBundle(
    outputDir: string,
    documents: IndexbindBuildDocument[],
    options?: {
      embeddingBackend?: 'hashing' | 'model2vec';
      hashingDimensions?: number;
      model?: string;
      batchSize?: number;
      sourceRootId?: string;
      sourceRootPath?: string;
      targetTokens?: number;
      overlapTokens?: number;
    },
  ): Promise<{ documentCount: number; chunkCount: number; vectorDimensions: number }>;
}

export interface SearchHit {
  docId: string;
  relativePath: string;
  canonicalUrl?: string;
  title?: string;
  summary?: string;
  metadata: Record<string, JsonValue>;
  score: number;
  bestMatch: {
    chunkId: number;
    excerpt: string;
    headingPath: string[];
    charStart: number;
    charEnd: number;
    score: number;
  };
}

interface IndexbindWebIndex {
  search(
    query: string,
    options?: {
      topK?: number;
      hybrid?: boolean;
      relativePathPrefix?: string;
      metadata?: Record<string, JsonValue>;
    },
  ): Promise<SearchHit[]>;
}

interface IndexbindWebModule {
  openWebIndex(base: string | URL): Promise<IndexbindWebIndex>;
}

interface IndexbindCloudflareModule {
  openWebIndex(base: string | URL): Promise<IndexbindWebIndex>;
}

export interface SearchApi {
  search(
    query: string,
    options?: {
      topK?: number;
      relativePathPrefix?: string;
    },
  ): Promise<SearchHit[]>;
}

export interface SearchBundleEntry {
  path: string;
  kind: 'text' | 'binary';
  mediaType: string;
  text?: string;
  base64?: string;
}

interface SearchDocument {
  absolutePath: string;
  relativePath: string;
}

export interface BuildSearchBundleOptions {
  rootDir: string;
  outDir: string;
  siteConfig: ResolvedSiteConfig;
  draftMode?: 'include' | 'exclude';
  embeddingBackend?: 'hashing' | 'model2vec';
  model?: string;
}

export interface BuildSearchBundleResult {
  outputDir: string;
  documentCount: number;
  chunkCount: number;
  vectorDimensions: number;
}

export interface SearchBundleOptions {
  indexDir: string;
  query: string;
  topK?: number;
  relativePathPrefix?: string;
}

export async function buildSearchBundle(
  options: BuildSearchBundleOptions,
): Promise<BuildSearchBundleResult> {
  const buildModule = await loadIndexbindBuildModule();
  const rootDir = path.resolve(options.rootDir);
  const documents = await collectSearchDocuments(rootDir, options.siteConfig, {
    draftMode: options.draftMode ?? 'exclude',
  });

  const stats = await buildModule.buildCanonicalBundle(
    path.resolve(options.outDir),
    documents,
    {
      embeddingBackend: options.embeddingBackend ?? 'model2vec',
      model: options.model,
      sourceRootId: path.basename(rootDir),
      sourceRootPath: rootDir,
    },
  );

  return {
    outputDir: path.resolve(options.outDir),
    documentCount: stats.documentCount,
    chunkCount: stats.chunkCount,
    vectorDimensions: stats.vectorDimensions,
  };
}

export async function searchBundle(
  options: SearchBundleOptions,
): Promise<SearchHit[]> {
  const webModule = await loadIndexbindWebModule();
  const index = await webModule.openWebIndex(path.resolve(options.indexDir));
  return rerankSearchHits(
    await index.search(options.query, {
      topK: options.topK ?? 10,
      relativePathPrefix: options.relativePathPrefix,
    }),
  );
}

export async function createSearchApiFromDirectory(indexDir: string): Promise<SearchApi> {
  const webModule = await loadIndexbindWebModule();
  const index = await webModule.openWebIndex(path.resolve(indexDir));
  return {
    async search(query, options) {
      return rerankSearchHits(
        await index.search(query, {
          topK: options?.topK,
          relativePathPrefix: options?.relativePathPrefix,
        }),
      );
    },
  };
}

export function createSearchApiFromBundle(
  bundleEntries: SearchBundleEntry[],
): SearchApi {
  let indexPromise: Promise<IndexbindWebIndex> | null = null;

  return {
    async search(query, options) {
      if (indexPromise === null) {
        indexPromise = openWebIndexFromBundle(bundleEntries);
      }

      const index = await indexPromise;
      return rerankSearchHits(
        await index.search(query, {
          topK: options?.topK,
          relativePathPrefix: options?.relativePathPrefix,
        }),
      );
    },
  };
}

async function collectSearchDocuments(
  rootDir: string,
  siteConfig: ResolvedSiteConfig,
  options: { draftMode: 'include' | 'exclude' },
): Promise<IndexbindBuildDocument[]> {
  const searchDocuments = await listSearchDocuments(rootDir);
  const documents: IndexbindBuildDocument[] = [];

  for (const document of searchDocuments) {
    const markdown = await readFile(document.absolutePath, 'utf8');
    const parsed = await parseMarkdownDocument(document.relativePath, markdown);
    if (parsed.meta.draft === true && options.draftMode === 'exclude') {
      continue;
    }

    const canonicalPath = getCanonicalHtmlPathForContentPath(document.relativePath);
    const absoluteCanonicalUrl = siteConfig.siteUrl
      ? new URL(trimLeadingSlash(canonicalPath), ensureTrailingSlash(siteConfig.siteUrl)).toString()
      : canonicalPath;
    documents.push({
      docId: canonicalPath,
      sourcePath: document.absolutePath,
      relativePath: document.relativePath,
      canonicalUrl: absoluteCanonicalUrl,
      title: getDocumentTitle(
        parsed.meta,
        parsed.body,
        fallbackTitleFromRelativePath(document.relativePath),
      ),
      summary: getDocumentSummary(parsed.meta, parsed.body),
      content: markdown,
      metadata: buildSearchMetadata(document.relativePath, canonicalPath, parsed.meta, siteConfig),
    });
  }

  return documents;
}

async function listSearchDocuments(rootDir: string): Promise<SearchDocument[]> {
  const results: SearchDocument[] = [];
  await walkDirectory(rootDir, '', new Set<string>(), results);
  results.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return results;
}

async function walkDirectory(
  absoluteDirectoryPath: string,
  relativeDirectoryPath: string,
  visitedRealDirectories: Set<string>,
  results: SearchDocument[],
): Promise<void> {
  const realDirectoryPath = await realpath(absoluteDirectoryPath);
  if (visitedRealDirectories.has(realDirectoryPath)) {
    return;
  }
  visitedRealDirectories.add(realDirectoryPath);

  const entries = await readdir(absoluteDirectoryPath, { withFileTypes: true });
  const shape = await inspectDirectoryShape(absoluteDirectoryPath);
  const indexFile = await resolveVisibleDirectoryIndexFile(
    absoluteDirectoryPath,
    relativeDirectoryPath,
  );

  if (indexFile) {
    results.push(indexFile);
  }

  for (const entry of entries) {
    if (isIgnoredContentName(entry.name)) {
      continue;
    }

    const absoluteEntryPath = path.join(absoluteDirectoryPath, entry.name);
    const entryStats = await stat(absoluteEntryPath);
    const relativeEntryPath =
      relativeDirectoryPath === ''
        ? entry.name
        : path.posix.join(relativeDirectoryPath, entry.name);

    if (entryStats.isFile()) {
      if (path.posix.extname(entry.name).toLowerCase() !== '.md') {
        continue;
      }

      if (DIRECTORY_INDEX_FILENAMES_LOWER.has(entry.name.toLowerCase())) {
        continue;
      }

      results.push({
        absolutePath: absoluteEntryPath,
        relativePath: relativeEntryPath,
      });
      continue;
    }

    if (!entryStats.isDirectory()) {
      continue;
    }

    if (shape.hasSkillIndex && isIgnoredSkillSupportDirectory(entry.name)) {
      continue;
    }

    if (indexFile) {
      const source = await readFile(indexFile.absolutePath, 'utf8');
      const parsed = await parseMarkdownDocument(indexFile.relativePath, source);
      if (inferDirectoryContentType(parsed.meta, shape) === 'post') {
        continue;
      }
    }

    await walkDirectory(
      absoluteEntryPath,
      relativeEntryPath,
      visitedRealDirectories,
      results,
    );
  }
}

async function resolveVisibleDirectoryIndexFile(
  absoluteDirectoryPath: string,
  relativeDirectoryPath: string,
): Promise<SearchDocument | null> {
  for (const candidate of getDirectoryIndexCandidates('')) {
    const absoluteCandidatePath = path.join(absoluteDirectoryPath, candidate);
    if (await pathExists(absoluteCandidatePath)) {
      return {
        absolutePath: absoluteCandidatePath,
        relativePath:
          relativeDirectoryPath === ''
            ? candidate
            : path.posix.join(relativeDirectoryPath, candidate),
      };
    }
  }

  return null;
}

async function inspectDirectoryShape(directoryPath: string): Promise<{
  hasSkillIndex: boolean;
  hasChildDirectories: boolean;
  hasExtraMarkdownFiles: boolean;
  hasAssetFiles: boolean;
}> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  let hasSkillIndex = false;
  let hasChildDirectories = false;
  let hasExtraMarkdownFiles = false;
  let hasAssetFiles = false;

  for (const entry of entries) {
    if (isIgnoredContentName(entry.name)) {
      continue;
    }

    const absoluteEntryPath = path.join(directoryPath, entry.name);
    const entryStats = await stat(absoluteEntryPath);

    if (entryStats.isDirectory()) {
      hasChildDirectories = true;
      continue;
    }

    if (!entryStats.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
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

function buildSearchMetadata(
  relativePath: string,
  canonicalPath: string,
  meta: ParsedDocumentMeta,
  siteConfig: ResolvedSiteConfig,
): Record<string, JsonValue> {
  const metadata: Record<string, JsonValue> = {
    markdownPath: `/${relativePath}`,
    canonicalPath,
    siteTitle: siteConfig.siteTitle,
  };

  if (meta.type === 'page' || meta.type === 'post') {
    metadata.type = meta.type;
  }

  if (typeof meta.date === 'string') {
    metadata.date = meta.date;
  }

  if (typeof meta.order === 'number') {
    metadata.order = meta.order;
  }

  if (Array.isArray(meta.aliases)) {
    metadata.aliases = meta.aliases;
  }

  return metadata;
}

function fallbackTitleFromRelativePath(relativePath: string): string {
  const baseName = path.posix.basename(relativePath);
  if (DIRECTORY_INDEX_FILENAMES_LOWER.has(baseName.toLowerCase())) {
    return path.posix.basename(path.posix.dirname(relativePath));
  }

  return baseName.replace(/\.md$/i, '');
}

function getCanonicalHtmlPathForContentPath(contentPath: string): string {
  const basename = path.posix.basename(contentPath).toLowerCase();
  if (
    basename === 'index.md' ||
    basename === 'readme.md' ||
    basename === 'skill.md'
  ) {
    const directory = path.posix.dirname(contentPath);
    return directory === '.' ? '/' : `/${directory}/`;
  }

  return `/${contentPath.slice(0, -'.md'.length)}`;
}

function trimLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }

    throw error;
  }
}

function isIgnoredSkillSupportDirectory(name: string): boolean {
  return (
    name === 'scripts' ||
    name === 'references' ||
    name === 'assets' ||
    name === 'templates'
  );
}

async function loadIndexbindBuildModule(): Promise<IndexbindBuildModule> {
  try {
    return (await import('indexbind/build')) as IndexbindBuildModule;
  } catch (error) {
    throw new Error(
      `Search build requires the optional package "indexbind". Install it first, for example: npm install indexbind`,
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

async function loadIndexbindWebModule(): Promise<IndexbindWebModule> {
  try {
    return (await import('indexbind/web')) as IndexbindWebModule;
  } catch (error) {
    throw new Error(
      `Search query requires the optional package "indexbind". Install it first, for example: npm install indexbind`,
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

async function loadIndexbindCloudflareModule(): Promise<IndexbindCloudflareModule> {
  try {
    return (await import('indexbind/cloudflare')) as IndexbindCloudflareModule;
  } catch (error) {
    throw new Error(
      `Search query requires the optional package "indexbind". Install it first, for example: npm install indexbind`,
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

async function openWebIndexFromBundle(
  bundleEntries: SearchBundleEntry[],
): Promise<IndexbindWebIndex> {
  const cloudflareModule = await loadIndexbindCloudflareModule();
  const baseUrl = 'https://mdorigin-search.invalid/';
  const originalFetch = globalThis.fetch;
  const bundleMap = new Map(
    bundleEntries.map((entry) => [new URL(entry.path, baseUrl).toString(), entry]),
  );

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const entry = bundleMap.get(requestUrl);
    if (entry) {
      const headers = new Headers({ 'content-type': entry.mediaType });
      const binaryBody = decodeBase64(entry.base64 ?? '');
      const body =
        entry.kind === 'text'
          ? entry.text ?? ''
          : new Blob([new Uint8Array(binaryBody)], {
              type: entry.mediaType,
            });
      return new Response(body, {
        status: 200,
        headers,
      });
    }

    return originalFetch(input as RequestInfo, init);
  };

  try {
    return await cloudflareModule.openWebIndex(new URL(baseUrl));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function rerankSearchHits(hits: SearchHit[]): SearchHit[] {
  const remaining = [...hits];
  const ordered: SearchHit[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const candidateScore = getDiversifiedSearchRankScore(candidate, ordered);
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestIndex = index;
        continue;
      }

      if (
        Math.abs(candidateScore - bestScore) <= 1e-9 &&
        compareHits(candidate, remaining[bestIndex]!) < 0
      ) {
        bestIndex = index;
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0]!);
  }

  return ordered;
}

function getDiversifiedSearchRankScore(
  hit: SearchHit,
  selectedHits: readonly SearchHit[],
): number {
  let adjusted = hit.score;
  const candidateSection = getTopLevelSection(hit.relativePath);
  const sameSectionCount = selectedHits.filter(
    (selectedHit) => getTopLevelSection(selectedHit.relativePath) === candidateSection,
  ).length;

  if (sameSectionCount > 0) {
    adjusted *= Math.pow(0.9, sameSectionCount);
  }

  if (isOverviewSearchHit(hit)) {
    adjusted *= sameSectionCount > 0 ? 0.72 : 0.84;
  }

  return adjusted;
}

function compareHits(left: SearchHit, right: SearchHit): number {
  if (right.bestMatch.score !== left.bestMatch.score) {
    return right.bestMatch.score - left.bestMatch.score;
  }

  return left.relativePath.localeCompare(right.relativePath);
}

function isOverviewSearchHit(hit: SearchHit): boolean {
  const baseName = path.posix.basename(hit.relativePath).toLowerCase();
  return baseName === 'readme.md' || baseName === 'index.md';
}

function getTopLevelSection(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/');
  const [firstSegment] = normalized.split('/', 1);
  return firstSegment ?? '';
}

const DIRECTORY_INDEX_FILENAMES_LOWER = new Set(
  getDirectoryIndexCandidates('').map((name) => name.toLowerCase()),
);
