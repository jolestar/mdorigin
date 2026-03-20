export interface RenderDocumentOptions {
  siteTitle: string;
  title: string;
  body: string;
  summary?: string;
  date?: string;
  showSummary?: boolean;
  showDate?: boolean;
  stylesheetContent?: string;
}

export function renderDocument(options: RenderDocumentOptions) {
  const title = escapeHtml(options.title);
  const siteTitle = escapeHtml(options.siteTitle);
  const summaryMeta = options.summary
    ? `<meta name="description" content="${escapeHtml(options.summary)}">`
    : '';
  const stylesheetBlock = options.stylesheetContent
    ? `<style>${options.stylesheetContent}</style>`
    : '';
  const summaryBlock =
    options.showSummary !== false && options.summary
      ? `<p>${escapeHtml(options.summary)}</p>`
      : '';
  const dateBlock =
    options.showDate !== false && options.date
    ? `<p><small>${escapeHtml(options.date)}</small></p>`
    : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title} | ${siteTitle}</title>`,
    summaryMeta,
    stylesheetBlock,
    '</head>',
    '<body>',
    `<header><p><a href="/">${siteTitle}</a></p></header>`,
    '<main>',
    `<article><p><strong>${title}</strong></p>${summaryBlock}${dateBlock}${options.body}</article>`,
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
