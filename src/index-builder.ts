import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseMarkdownDocument } from './core/markdown.js';

const INDEX_START_MARKER = '<!-- INDEX:START -->';
const INDEX_END_MARKER = '<!-- INDEX:END -->';

interface ArticleIndexEntry {
  title: string;
  date?: string;
  summary?: string;
  link: string;
}

interface DirectoryIndexEntry {
  title: string;
  link: string;
}

export interface BuildIndexOptions {
  rootDir?: string;
  dir?: string;
}

export interface BuildIndexResult {
  updatedFiles: string[];
  skippedDirectories: string[];
}

export async function buildDirectoryIndexes(
  options: BuildIndexOptions,
): Promise<BuildIndexResult> {
  if (!options.rootDir && !options.dir) {
    throw new Error('Expected either rootDir or dir.');
  }

  if (options.rootDir && options.dir) {
    throw new Error('Use either rootDir or dir, not both.');
  }

  if (options.dir) {
    const directoryPath = path.resolve(options.dir);
    const updatedFile = await updateSingleDirectoryIndex(directoryPath, {
      createIfMissing: false,
    });
    return {
      updatedFiles: updatedFile ? [updatedFile] : [],
      skippedDirectories: updatedFile ? [] : [directoryPath],
    };
  }

  const rootDir = path.resolve(options.rootDir!);
  const directories = await listDirectoriesRecursively(rootDir);
  const updatedFiles: string[] = [];
  const skippedDirectories: string[] = [];

  for (const directoryPath of directories) {
    const updatedFile = await updateSingleDirectoryIndex(directoryPath, {
      createIfMissing: false,
    });
    if (updatedFile) {
      updatedFiles.push(updatedFile);
      continue;
    }

    skippedDirectories.push(directoryPath);
  }

  return { updatedFiles, skippedDirectories };
}

interface UpdateSingleDirectoryIndexOptions {
  createIfMissing: boolean;
}

async function updateSingleDirectoryIndex(
  directoryPath: string,
  options: UpdateSingleDirectoryIndexOptions,
): Promise<string | null> {
  const indexFilePath = path.join(directoryPath, 'index.md');
  const indexExists = await pathExists(indexFilePath);
  if (!indexExists && !options.createIfMissing) {
    return null;
  }

  const existingContent = indexExists ? await readFile(indexFilePath, 'utf8') : '';
  const block = await buildManagedIndexBlock(directoryPath);
  const nextContent = upsertManagedIndexBlock(existingContent, block, {
    directoryPath,
  });

  if (nextContent !== existingContent) {
    await writeFile(indexFilePath, nextContent, 'utf8');
  }

  return indexFilePath;
}

export async function buildManagedIndexBlock(directoryPath: string): Promise<string> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const directories: DirectoryIndexEntry[] = [];
  const articles: ArticleIndexEntry[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const title = await resolveDirectoryTitle(fullPath, entry.name);
      directories.push({
        title,
        link: `./${entry.name}/`,
      });
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') {
      continue;
    }

    if (entry.name === 'index.md') {
      continue;
    }

    const source = await readFile(fullPath, 'utf8');
    const parsed = await parseMarkdownDocument(entry.name, source);
    if (parsed.meta.draft === true) {
      continue;
    }

    articles.push({
      title: parsed.meta.title ?? entry.name.slice(0, -'.md'.length),
      date: parsed.meta.date,
      summary: parsed.meta.summary ?? extractFirstParagraph(parsed.body),
      link: `./${entry.name}`,
    });
  }

  directories.sort((left, right) => left.title.localeCompare(right.title));
  articles.sort(compareArticles);

  return renderManagedIndexBlock(directories, articles);
}

export function upsertManagedIndexBlock(
  source: string,
  block: string,
  options: { directoryPath?: string } = {},
): string {
  const hasStart = source.includes(INDEX_START_MARKER);
  const hasEnd = source.includes(INDEX_END_MARKER);

  if (hasStart !== hasEnd) {
    const scope = options.directoryPath ? ` in ${options.directoryPath}` : '';
    throw new Error(`Found only one index marker${scope}.`);
  }

  if (hasStart && hasEnd) {
    const pattern = new RegExp(
      `${escapeRegExp(INDEX_START_MARKER)}[\\s\\S]*?${escapeRegExp(INDEX_END_MARKER)}`,
      'm',
    );
    return source.replace(pattern, block);
  }

  const trimmed = source.trimEnd();
  if (trimmed === '') {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

function renderManagedIndexBlock(
  directories: DirectoryIndexEntry[],
  articles: ArticleIndexEntry[],
): string {
  const lines = [INDEX_START_MARKER, ''];

  if (directories.length > 0) {
    lines.push('## Directories');
    for (const entry of directories) {
      lines.push(`- [${entry.title}](${entry.link})`);
    }
    lines.push('');
  }

  if (articles.length > 0) {
    lines.push('## Articles');
    for (const article of articles) {
      lines.push(`- [${article.title}](${article.link})`);
      const detail = [article.date, article.summary].filter(Boolean).join(' · ');
      if (detail !== '') {
        lines.push(`  ${detail}`);
      }
      lines.push('');
    }
  }

  if (directories.length === 0 && articles.length === 0) {
    lines.push('No entries yet.');
    lines.push('');
  }

  lines.push(INDEX_END_MARKER);
  return lines.join('\n');
}

async function resolveDirectoryTitle(
  directoryPath: string,
  fallbackName: string,
): Promise<string> {
  const indexPath = path.join(directoryPath, 'index.md');
  if (!(await pathExists(indexPath))) {
    return fallbackName;
  }

  const source = await readFile(indexPath, 'utf8');
  const parsed = await parseMarkdownDocument('index.md', source);
  if (parsed.meta.draft === true) {
    return fallbackName;
  }

  return parsed.meta.title ?? fallbackName;
}

async function listDirectoriesRecursively(rootDir: string): Promise<string[]> {
  const directories = [rootDir];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    directories.push(
      ...(await listDirectoriesRecursively(path.join(rootDir, entry.name))),
    );
  }

  return directories;
}

function compareArticles(left: ArticleIndexEntry, right: ArticleIndexEntry): number {
  const leftTimestamp = left.date ? Date.parse(left.date) : Number.NaN;
  const rightTimestamp = right.date ? Date.parse(right.date) : Number.NaN;

  if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp)) {
    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }
  } else if (!Number.isNaN(leftTimestamp)) {
    return -1;
  } else if (!Number.isNaN(rightTimestamp)) {
    return 1;
  }

  return left.title.localeCompare(right.title);
}

function extractFirstParagraph(markdown: string): string | undefined {
  const paragraphs = markdown
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');

  for (const paragraph of paragraphs) {
    if (
      paragraph.startsWith('#') ||
      paragraph.startsWith('<!--') ||
      paragraph.startsWith('- ') ||
      paragraph.startsWith('* ')
    ) {
      continue;
    }

    return paragraph.replace(/\s+/g, ' ');
  }

  return undefined;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
