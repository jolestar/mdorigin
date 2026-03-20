export interface RenderDocumentOptions {
  title: string;
  body: string;
  summary?: string;
  date?: string;
}

export function renderDocument(options: RenderDocumentOptions) {
  const title = escapeHtml(options.title);
  const summaryMeta = options.summary
    ? `<meta name="description" content="${escapeHtml(options.summary)}">`
    : '';
  const dateBlock = options.date
    ? `<p><small>${escapeHtml(options.date)}</small></p>`
    : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    summaryMeta,
    '</head>',
    '<body>',
    '<main>',
    `<article>${dateBlock}${options.body}</article>`,
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
