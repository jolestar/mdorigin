import type {
  SiteLogo,
  SiteNavItem,
  SiteSocialLink,
} from '../core/site-config.js';
import type { TemplateName } from './template-kind.js';
import { getBuiltInThemeStyles, type BuiltInThemeName } from './theme.js';

export interface RenderDocumentOptions {
  siteTitle: string;
  siteDescription?: string;
  siteUrl?: string;
  favicon?: string;
  logo?: SiteLogo;
  title: string;
  body: string;
  summary?: string;
  date?: string;
  showSummary?: boolean;
  showDate?: boolean;
  theme: BuiltInThemeName;
  template: TemplateName;
  topNav?: SiteNavItem[];
  footerNav?: SiteNavItem[];
  footerText?: string;
  socialLinks?: SiteSocialLink[];
  editLinkHref?: string;
  stylesheetContent?: string;
  canonicalPath?: string;
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
  const canonicalMeta =
    options.siteUrl && options.canonicalPath
      ? `<link rel="canonical" href="${escapeHtml(
          `${options.siteUrl}${options.canonicalPath}`,
        )}">`
      : '';
  const faviconMeta = options.favicon
    ? `<link rel="icon" href="${escapeHtml(options.favicon)}">`
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
  const footerNavBlock =
    options.footerNav && options.footerNav.length > 0
      ? `<nav class="site-footer__nav"><ul>${options.footerNav
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`,
          )
          .join('')}</ul></nav>`
      : '';
  const socialLinksBlock =
    options.socialLinks && options.socialLinks.length > 0
      ? `<ul class="site-footer__social">${options.socialLinks
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.href)}" aria-label="${escapeHtml(
                item.label,
              )}" title="${escapeHtml(item.label)}">${renderSocialIcon(item.icon)}</a></li>`,
          )
          .join('')}</ul>`
      : '';
  const siteDescriptionBlock = siteDescription
    ? `<span>${siteDescription}</span>`
    : '';
  const logoBlock = options.logo
    ? `<span class="site-header__logo"><img src="${escapeHtml(options.logo.src)}" alt="${escapeHtml(options.logo.alt ?? '')}"></span>`
    : '';
  const brandHref = escapeHtml(options.logo?.href ?? '/');
  const editLinkBlock = options.editLinkHref
    ? `<a class="site-footer__edit-link" href="${escapeHtml(options.editLinkHref)}">Edit this page</a>`
    : '';
  const footerTextBlock = options.footerText
    ? `<p class="site-footer__text">${escapeHtml(options.footerText)}</p>`
    : '';
  const footerBlock =
    footerNavBlock || socialLinksBlock || footerTextBlock || editLinkBlock
      ? `<footer class="site-footer"><div class="site-footer__inner">${footerNavBlock}${socialLinksBlock}${footerTextBlock}${editLinkBlock}</div></footer>`
      : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title} | ${siteTitle}</title>`,
    summaryMeta,
    canonicalMeta,
    faviconMeta,
    stylesheetBlock,
    '</head>',
    `<body data-theme="${options.theme}" data-template="${options.template}">`,
    `<header class="site-header"><div class="site-header__inner"><div class="site-header__brand"><p class="site-header__title"><a href="${brandHref}">${logoBlock}<span>${siteTitle}</span></a></p>${siteDescriptionBlock}</div>${navBlock}</div></header>`,
    '<main>',
    `<article>${options.body}</article>`,
    '</main>',
    footerBlock,
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

function renderSocialIcon(icon: string): string {
  switch (icon) {
    case 'github':
      return iconSvg(
        'M12 2C6.48 2 2 6.58 2 12.11c0 4.43 2.87 8.18 6.84 9.5.5.1.68-.22.68-.48 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.19-3.37-1.19-.46-1.17-1.11-1.48-1.11-1.48-.91-.63.07-.62.07-.62 1 .08 1.53 1.04 1.53 1.04.9 1.54 2.35 1.09 2.92.84.09-.66.35-1.09.63-1.34-2.22-.25-4.55-1.12-4.55-4.97 0-1.1.39-2 1.03-2.71-.1-.26-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.03A9.4 9.4 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.3 2.75-1.03 2.75-1.03.55 1.39.2 2.42.1 2.68.64.71 1.03 1.61 1.03 2.71 0 3.86-2.33 4.72-4.56 4.97.36.31.68.91.68 1.84 0 1.33-.01 2.4-.01 2.73 0 .27.18.58.69.48A10.11 10.11 0 0 0 22 12.11C22 6.58 17.52 2 12 2Z',
      );
    case 'rss':
      return iconSvg(
        'M5 3a16 16 0 0 1 16 16h-3A13 13 0 0 0 5 6V3Zm0 6a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V9Zm0 6a4 4 0 0 1 4 4H5v-4Zm0 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
      );
    case 'npm':
      return iconSvg(
        'M3 7h18v10h-9v-8h-3v8H3V7Zm10 2h2v6h2V9h2v6h1V9h1V8h-8v1Z',
      );
    case 'x':
      return iconSvg(
        'M18.9 3H21l-6.87 7.85L22 21h-6.17l-4.83-6.32L5.47 21H3.36l7.35-8.4L2 3h6.32l4.37 5.77L18.9 3Zm-2.17 16h1.17L7.68 4H6.43l10.3 15Z',
      );
    case 'home':
      return iconSvg(
        'M12 3 3 10.2V21h6v-6h6v6h6V10.2L12 3Z',
      );
    default:
      return `<span class="site-footer__social-label">${escapeHtml(icon.slice(0, 1).toUpperCase())}</span>`;
  }
}

function iconSvg(pathData: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${pathData}"></path></svg>`;
}
