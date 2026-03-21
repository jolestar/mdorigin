import type { SiteNavItem } from '../core/site-config.js';
import type { TemplateName } from './template-kind.js';
import { getBuiltInThemeStyles, type BuiltInThemeName } from './theme.js';

export interface RenderDocumentOptions {
  siteTitle: string;
  siteDescription?: string;
  title: string;
  body: string;
  summary?: string;
  date?: string;
  showSummary?: boolean;
  showDate?: boolean;
  theme: BuiltInThemeName;
  template: TemplateName;
  topNav?: SiteNavItem[];
  stylesheetContent?: string;
}

export function renderDocument(options: RenderDocumentOptions) {
  const title = escapeHtml(options.title);
  const siteTitle = escapeHtml(options.siteTitle);
  const siteDescription = options.siteDescription
    ? escapeHtml(options.siteDescription)
    : undefined;
  const summaryMeta = options.summary
    ? `<meta name="description" content="${escapeHtml(options.summary)}">`
    : '';
  const stylesheetBlock = `<style>${getBuiltInThemeStyles(options.theme)}${
    options.stylesheetContent ? `\n${options.stylesheetContent}` : ''
  }</style>`;
  const navBlock =
    options.topNav && options.topNav.length > 0
      ? `<nav class="site-nav"><ul>${options.topNav
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`,
          )
          .join('')}</ul></nav>`
      : '';
  const siteDescriptionBlock = siteDescription
    ? `<span>${siteDescription}</span>`
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
    `<body data-theme="${options.theme}" data-template="${options.template}">`,
    `<header class="site-header"><div class="site-header__inner"><div class="site-header__brand"><p class="site-header__title"><a href="/">${siteTitle}</a></p>${siteDescriptionBlock}</div>${navBlock}</div></header>`,
    '<main>',
    `<article>${options.body}</article>`,
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
