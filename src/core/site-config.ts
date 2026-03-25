import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ContentStore } from './content-store.js';
import { getDirectoryIndexCandidates } from './directory-index.js';
import { parseMarkdownDocument } from './markdown.js';
import type { TemplateName } from '../html/template-kind.js';
import type { BuiltInThemeName } from '../html/theme.js';

export interface SiteNavItem {
  label: string;
  href: string;
}

export interface SiteLogo {
  src: string;
  alt?: string;
  href?: string;
}

export interface SiteSocialLink {
  icon: string;
  label: string;
  href: string;
}

export interface EditLinkConfig {
  baseUrl: string;
}

export interface SiteConfig {
  siteTitle?: string;
  siteDescription?: string;
  siteUrl?: string;
  favicon?: string;
  socialImage?: string;
  logo?: SiteLogo;
  showDate?: boolean;
  showSummary?: boolean;
  stylesheet?: string;
  theme?: BuiltInThemeName;
  template?: TemplateName;
  topNav?: SiteNavItem[];
  footerNav?: SiteNavItem[];
  footerText?: string;
  socialLinks?: SiteSocialLink[];
  editLink?: EditLinkConfig;
  showHomeIndex?: boolean;
  catalogInitialPostCount?: number;
  catalogLoadMoreStep?: number;
}

export interface ResolvedSiteConfig {
  siteTitle: string;
  siteDescription?: string;
  siteUrl?: string;
  favicon?: string;
  socialImage?: string;
  logo?: SiteLogo;
  showDate: boolean;
  showSummary: boolean;
  theme: BuiltInThemeName;
  template: TemplateName;
  topNav: SiteNavItem[];
  footerNav: SiteNavItem[];
  footerText?: string;
  socialLinks: SiteSocialLink[];
  editLink?: EditLinkConfig;
  showHomeIndex: boolean;
  catalogInitialPostCount: number;
  catalogLoadMoreStep: number;
  stylesheetContent?: string;
  siteTitleConfigured: boolean;
  siteDescriptionConfigured: boolean;
}

export interface LoadSiteConfigOptions {
  cwd?: string;
  rootDir?: string;
  configPath?: string;
}

export async function loadSiteConfig(
  options: LoadSiteConfigOptions = {},
): Promise<ResolvedSiteConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : null;
  const configFilePath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : await resolveDefaultConfigPath(cwd, rootDir);

  let parsedConfig: SiteConfig = {};
  try {
    const configSource = await readFile(configFilePath, 'utf8');
    parsedConfig = JSON.parse(configSource) as SiteConfig;
  } catch (error) {
    if (!isNodeNotFound(error)) {
      throw error;
    }
  }

  const stylesheetPath = parsedConfig.stylesheet
    ? path.resolve(path.dirname(configFilePath), parsedConfig.stylesheet)
    : null;
  const stylesheetContent = stylesheetPath
    ? await readFile(stylesheetPath, 'utf8')
    : undefined;

  return {
    siteTitle:
      typeof parsedConfig.siteTitle === 'string' && parsedConfig.siteTitle !== ''
        ? parsedConfig.siteTitle
        : 'mdorigin',
    siteDescription:
      typeof parsedConfig.siteDescription === 'string' &&
      parsedConfig.siteDescription !== ''
        ? parsedConfig.siteDescription
        : undefined,
    siteUrl: normalizeSiteUrl(parsedConfig.siteUrl),
    favicon: normalizeSiteHref(parsedConfig.favicon),
    socialImage: normalizeSiteHref(parsedConfig.socialImage),
    logo: normalizeLogo(parsedConfig.logo),
    showDate: parsedConfig.showDate ?? true,
    showSummary: parsedConfig.showSummary ?? true,
    theme: isBuiltInThemeName(parsedConfig.theme) ? parsedConfig.theme : 'paper',
    template: isTemplateName(parsedConfig.template) ? parsedConfig.template : 'document',
    topNav: normalizeTopNav(parsedConfig.topNav),
    footerNav: normalizeTopNav(parsedConfig.footerNav),
    footerText:
      typeof parsedConfig.footerText === 'string' && parsedConfig.footerText !== ''
        ? parsedConfig.footerText
        : undefined,
    socialLinks: normalizeSocialLinks(parsedConfig.socialLinks),
    editLink: normalizeEditLink(parsedConfig.editLink),
    showHomeIndex:
      typeof parsedConfig.showHomeIndex === 'boolean'
        ? parsedConfig.showHomeIndex
        : normalizeTopNav(parsedConfig.topNav).length === 0,
    catalogInitialPostCount: normalizePositiveInteger(
      parsedConfig.catalogInitialPostCount,
      10,
    ),
    catalogLoadMoreStep: normalizePositiveInteger(
      parsedConfig.catalogLoadMoreStep,
      10,
    ),
    stylesheetContent,
    siteTitleConfigured:
      typeof parsedConfig.siteTitle === 'string' && parsedConfig.siteTitle !== '',
    siteDescriptionConfigured:
      typeof parsedConfig.siteDescription === 'string' &&
      parsedConfig.siteDescription !== '',
  };
}

export async function applySiteConfigFrontmatterDefaults(
  store: ContentStore,
  siteConfig: ResolvedSiteConfig,
): Promise<ResolvedSiteConfig> {
  if (siteConfig.siteTitleConfigured && siteConfig.siteDescriptionConfigured) {
    return siteConfig;
  }

  for (const candidatePath of getDirectoryIndexCandidates('')) {
    const entry = await store.get(candidatePath);
    if (entry === null || entry.kind !== 'text' || entry.text === undefined) {
      continue;
    }

    const parsed = await parseMarkdownDocument(candidatePath, entry.text);

    return {
      ...siteConfig,
      siteTitle:
        siteConfig.siteTitleConfigured
          ? siteConfig.siteTitle
          : typeof parsed.meta.title === 'string' && parsed.meta.title !== ''
            ? parsed.meta.title
            : siteConfig.siteTitle,
      siteDescription:
        siteConfig.siteDescriptionConfigured
          ? siteConfig.siteDescription
          : typeof parsed.meta.summary === 'string' && parsed.meta.summary !== ''
            ? parsed.meta.summary
            : siteConfig.siteDescription,
    };
  }

  return siteConfig;
}

async function resolveDefaultConfigPath(
  cwd: string,
  rootDir: string | null,
): Promise<string> {
  const rootConfigPath = rootDir ? path.join(rootDir, 'mdorigin.config.json') : null;
  if (rootConfigPath && (await pathExists(rootConfigPath))) {
    return rootConfigPath;
  }

  return path.join(cwd, 'mdorigin.config.json');
}

function isBuiltInThemeName(value: unknown): value is BuiltInThemeName {
  return value === 'paper' || value === 'atlas' || value === 'gazette';
}

function isTemplateName(value: unknown): value is TemplateName {
  return value === 'document' || value === 'catalog';
}

function isNodeNotFound(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch (error) {
    if (isNodeNotFound(error)) {
      return false;
    }

    throw error;
  }
}

function normalizeTopNav(value: unknown): SiteNavItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      'href' in item &&
      typeof item.label === 'string' &&
      item.label !== '' &&
      typeof item.href === 'string' &&
      item.href !== ''
    ) {
      const href = normalizeSiteHref(item.href);
      return href ? [{ label: item.label, href }] : [];
    }

    return [];
  });
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeLogo(value: unknown): SiteLogo | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('src' in value) ||
    typeof value.src !== 'string' ||
    value.src === ''
  ) {
    return undefined;
  }

  const src = normalizeSiteHref(value.src);
  if (!src) {
    return undefined;
  }

  const href =
    'href' in value && typeof value.href === 'string'
      ? normalizeSiteHref(value.href)
      : undefined;

  return {
    src,
    alt:
      'alt' in value && typeof value.alt === 'string' && value.alt !== ''
        ? value.alt
        : undefined,
    href,
  };
}

function normalizeSocialLinks(value: unknown): SiteSocialLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('icon' in item) ||
      !('label' in item) ||
      !('href' in item) ||
      typeof item.icon !== 'string' ||
      item.icon === '' ||
      typeof item.label !== 'string' ||
      item.label === '' ||
      typeof item.href !== 'string' ||
      item.href === ''
    ) {
      return [];
    }

    const href = normalizeSiteHref(item.href);
    return href
      ? [{ icon: item.icon, label: item.label, href }]
      : [];
  });
}

function normalizeEditLink(value: unknown): EditLinkConfig | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('baseUrl' in value) ||
    typeof value.baseUrl !== 'string' ||
    value.baseUrl === ''
  ) {
    return undefined;
  }

  return { baseUrl: value.baseUrl };
}

function normalizeSiteUrl(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value.replace(/\/+$/, '') : undefined;
}

function normalizeSiteHref(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }

  if (
    value.startsWith('/') ||
    value.startsWith('#') ||
    value.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  ) {
    return value;
  }

  return `/${value.replace(/^\.?\//, '')}`;
}
