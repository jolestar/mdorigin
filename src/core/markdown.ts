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
  const html = await renderMarkdown(parsed.content);

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
