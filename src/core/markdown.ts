import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export interface ParsedDocumentMeta {
  title?: string;
  date?: string;
  summary?: string;
  draft?: boolean;
  [key: string]: unknown;
}

export interface ParsedDocument {
  sourcePath: string;
  body: string;
  html: string;
  meta: ParsedDocumentMeta;
}

export async function parseMarkdownDocument(
  sourcePath: string,
  markdown: string,
): Promise<ParsedDocument> {
  const parsed = matter(markdown);
  const html = rewriteMarkdownLinksInHtml(await renderMarkdown(parsed.content));

  return {
    sourcePath,
    body: parsed.content,
    html,
    meta: normalizeMeta(parsed.data),
  };
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const output = await remark()
    .use(remarkGfm)
    .use(remarkHtml)
    .process(markdown);

  return String(output);
}

export function rewriteMarkdownLinksInHtml(html: string): string {
  return html.replaceAll(
    /(<a\b[^>]*?\shref=")([^"]+)(")/g,
    (_match, prefix: string, href: string, suffix: string) =>
      `${prefix}${rewriteMarkdownHref(href)}${suffix}`,
  );
}

function normalizeMeta(data: Record<string, unknown>): ParsedDocumentMeta {
  const meta: ParsedDocumentMeta = { ...data };

  if (typeof data.title === 'string') {
    meta.title = data.title;
  }

  if (typeof data.date === 'string') {
    meta.date = data.date;
  }

  if (data.date instanceof Date && !Number.isNaN(data.date.getTime())) {
    meta.date = data.date.toISOString().slice(0, 10);
  }

  if (typeof data.summary === 'string') {
    meta.summary = data.summary;
  }

  if (typeof data.draft === 'boolean') {
    meta.draft = data.draft;
  }

  return meta;
}

function rewriteMarkdownHref(href: string): string {
  if (shouldPreserveHref(href)) {
    return href;
  }

  const [pathPart, hashPart] = splitOnce(href, '#');
  const [pathname, queryPart] = splitOnce(pathPart, '?');

  if (!pathname.toLowerCase().endsWith('.md')) {
    return href;
  }

  const normalizedPath = pathname.replace(/\\/g, '/');
  const rewrittenPath = rewriteMarkdownPath(normalizedPath);
  const querySuffix = queryPart !== undefined ? `?${queryPart}` : '';
  const hashSuffix = hashPart !== undefined ? `#${hashPart}` : '';
  return `${rewrittenPath}${querySuffix}${hashSuffix}`;
}

function rewriteMarkdownPath(pathname: string): string {
  if (pathname.toLowerCase().endsWith('/index.md')) {
    return pathname.slice(0, -'index.md'.length);
  }

  if (pathname.toLowerCase() === 'index.md') {
    return './';
  }

  if (pathname.toLowerCase().endsWith('/readme.md')) {
    return pathname.slice(0, -'README.md'.length);
  }

  if (pathname.toLowerCase() === 'readme.md') {
    return './';
  }

  return pathname.slice(0, -'.md'.length);
}

function shouldPreserveHref(href: string): boolean {
  return (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)
  );
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
  const index = value.indexOf(separator);
  if (index === -1) {
    return [value, undefined];
  }

  return [value.slice(0, index), value.slice(index + separator.length)];
}
