import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';

import type { ContentStore } from './content-store.js';
import { getDirectoryIndexCandidates } from './directory-index.js';
import { parseMarkdownDocument } from './markdown.js';
import type { MdoPlugin } from './extensions.js';

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

export interface SiteSearchRerankerConfig {
  kind?: 'embedding-v1' | 'heuristic-v1';
  candidatePoolSize?: number;
}

export interface SiteSearchScoreAdjustmentConfig {
  metadataNumericMultiplier?: string;
}

export interface SiteSearchConfig {
  topK?: number;
  mode?: 'hybrid' | 'vector';
  minScore?: number;
  reranker?: SiteSearchRerankerConfig;
  scoreAdjustment?: SiteSearchScoreAdjustmentConfig;
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
  topNav?: SiteNavItem[];
  footerNav?: SiteNavItem[];
  footerText?: string;
  socialLinks?: SiteSocialLink[];
  editLink?: EditLinkConfig;
  showHomeIndex?: boolean;
  listingInitialPostCount?: number;
  listingLoadMoreStep?: number;
  search?: SiteSearchConfig;
}

export interface UserSiteConfig extends SiteConfig {
  plugins?: MdoPlugin[];
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
  topNav: SiteNavItem[];
  footerNav: SiteNavItem[];
  footerText?: string;
  socialLinks: SiteSocialLink[];
  editLink?: EditLinkConfig;
  showHomeIndex: boolean;
  listingInitialPostCount: number;
  listingLoadMoreStep: number;
  search?: SiteSearchConfig;
  stylesheetContent?: string;
  siteTitleConfigured: boolean;
  siteDescriptionConfigured: boolean;
}

export interface LoadSiteConfigOptions {
  cwd?: string;
  rootDir?: string;
  configPath?: string;
}

export interface LoadedSiteConfig {
  siteConfig: ResolvedSiteConfig;
  plugins: MdoPlugin[];
  configFilePath: string;
  configModulePath?: string;
}

export async function loadSiteConfig(
  options: LoadSiteConfigOptions = {},
): Promise<ResolvedSiteConfig> {
  return (await loadUserSiteConfig(options)).siteConfig;
}

export async function loadUserSiteConfig(
  options: LoadSiteConfigOptions = {},
): Promise<LoadedSiteConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : null;
  const configFilePath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : await resolveDefaultConfigPath(cwd, rootDir);

  const parsedConfig = await loadConfigSource(configFilePath);
  const legacyConfig = parsedConfig as Record<string, unknown>;

  const stylesheetPath = parsedConfig.stylesheet
    ? path.resolve(path.dirname(configFilePath), parsedConfig.stylesheet)
    : null;
  const stylesheetContent = stylesheetPath
    ? await readFile(stylesheetPath, 'utf8')
    : undefined;

  const siteConfig: ResolvedSiteConfig = {
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
    listingInitialPostCount: normalizePositiveInteger(
      parsedConfig.listingInitialPostCount ?? legacyConfig.catalogInitialPostCount,
      10,
    ),
    listingLoadMoreStep: normalizePositiveInteger(
      parsedConfig.listingLoadMoreStep ?? legacyConfig.catalogLoadMoreStep,
      10,
    ),
    search: normalizeSearchConfig(parsedConfig.search, configFilePath),
    stylesheetContent,
    siteTitleConfigured:
      typeof parsedConfig.siteTitle === 'string' && parsedConfig.siteTitle !== '',
    siteDescriptionConfigured:
      typeof parsedConfig.siteDescription === 'string' &&
      parsedConfig.siteDescription !== '',
  };

  warnOnLegacyConfig(legacyConfig, configFilePath);

  return {
    siteConfig,
    plugins: Array.isArray(parsedConfig.plugins) ? parsedConfig.plugins : [],
    configFilePath,
    configModulePath: isCodeConfigPath(configFilePath) ? configFilePath : undefined,
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
  const rootConfigPath = rootDir ? await findConfigPath(rootDir) : null;
  if (rootConfigPath) {
    return rootConfigPath;
  }

  return (await findConfigPath(cwd)) ?? path.join(cwd, 'mdorigin.config.json');
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
    await stat(filePath);
    return true;
  } catch (error) {
    if (isNodeNotFound(error)) {
      return false;
    }

    throw error;
  }
}

async function findConfigPath(directory: string): Promise<string | null> {
  for (const candidate of getConfigCandidates(directory)) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getConfigCandidates(directory: string): string[] {
  return [
    path.join(directory, 'mdorigin.config.ts'),
    path.join(directory, 'mdorigin.config.mjs'),
    path.join(directory, 'mdorigin.config.js'),
    path.join(directory, 'mdorigin.config.json'),
  ];
}

async function loadConfigSource(configFilePath: string): Promise<UserSiteConfig> {
  if (!(await pathExists(configFilePath))) {
    return {};
  }

  if (configFilePath.endsWith('.json')) {
    const configSource = await readFile(configFilePath, 'utf8');
    return JSON.parse(configSource) as UserSiteConfig;
  }

  const imported = configFilePath.endsWith('.ts')
    ? await tsImport(configFilePath, import.meta.url)
    : await import(pathToFileURL(configFilePath).href);
  const config = unwrapConfigModule(imported);
  if (typeof config !== 'object' || config === null) {
    throw new Error(`${configFilePath} must export a config object`);
  }

  return config as UserSiteConfig;
}

function isCodeConfigPath(filePath: string): boolean {
  return /\.(mjs|js|ts)$/.test(filePath);
}

export function defineConfig(config: UserSiteConfig): UserSiteConfig {
  return config;
}

function unwrapConfigModule(moduleValue: unknown): unknown {
  let current = moduleValue;
  while (
    typeof current === 'object' &&
    current !== null &&
    'default' in current &&
    (current as { default?: unknown }).default !== undefined
  ) {
    current = (current as { default: unknown }).default;
  }

  if (
    typeof current === 'object' &&
    current !== null &&
    'config' in current &&
    (current as { config?: unknown }).config !== undefined
  ) {
    return (current as { config: unknown }).config;
  }

  return current;
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

function normalizeOptionalPositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeSearchConfig(
  value: unknown,
  configFilePath: string,
): SiteSearchConfig | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  if ('hybrid' in value) {
    throw new Error(
      `[mdorigin] ${configFilePath}: "search.hybrid" has been removed. Use "search.mode" with "hybrid" or "vector" instead.`,
    );
  }

  const searchConfig = value as Record<string, unknown>;
  const reranker =
    typeof searchConfig.reranker === 'object' && searchConfig.reranker !== null
      ? normalizeSearchReranker(searchConfig.reranker)
      : undefined;
  const scoreAdjustment =
    typeof searchConfig.scoreAdjustment === 'object' &&
    searchConfig.scoreAdjustment !== null
      ? normalizeSearchScoreAdjustment(searchConfig.scoreAdjustment)
      : undefined;

  const normalized: SiteSearchConfig = {
    topK: normalizeOptionalPositiveInteger(searchConfig.topK),
    mode:
      searchConfig.mode === 'hybrid' || searchConfig.mode === 'vector'
        ? searchConfig.mode
        : undefined,
    minScore: normalizeOptionalNumber(searchConfig.minScore),
    reranker,
    scoreAdjustment,
  };

  return Object.values(normalized).some((entry) => entry !== undefined)
    ? normalized
    : undefined;
}

function normalizeSearchReranker(value: unknown): SiteSearchRerankerConfig | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const reranker = value as Record<string, unknown>;
  const normalized: SiteSearchRerankerConfig = {
    kind:
      reranker.kind === 'embedding-v1' || reranker.kind === 'heuristic-v1'
        ? reranker.kind
        : undefined,
    candidatePoolSize: normalizeOptionalPositiveInteger(reranker.candidatePoolSize),
  };

  return Object.values(normalized).some((entry) => entry !== undefined)
    ? normalized
    : undefined;
}

function normalizeSearchScoreAdjustment(
  value: unknown,
): SiteSearchScoreAdjustmentConfig | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const scoreAdjustment = value as Record<string, unknown>;
  const normalized: SiteSearchScoreAdjustmentConfig = {
    metadataNumericMultiplier:
      typeof scoreAdjustment.metadataNumericMultiplier === 'string' &&
      scoreAdjustment.metadataNumericMultiplier !== ''
        ? scoreAdjustment.metadataNumericMultiplier
        : undefined,
  };

  return Object.values(normalized).some((entry) => entry !== undefined)
    ? normalized
    : undefined;
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

function warnOnLegacyConfig(config: Record<string, unknown>, configFilePath: string): void {
  if ('theme' in config) {
    console.warn(
      `[mdorigin] ${configFilePath}: "theme" is deprecated and ignored. mdorigin now uses a single built-in atlas presentation.`,
    );
  }

  if ('template' in config) {
    console.warn(
      `[mdorigin] ${configFilePath}: "template" is deprecated and ignored. Listing behavior is now part of the default presentation.`,
    );
  }

  if ('catalogInitialPostCount' in config) {
    console.warn(
      `[mdorigin] ${configFilePath}: "catalogInitialPostCount" is deprecated. Use "listingInitialPostCount" instead.`,
    );
  }

  if ('catalogLoadMoreStep' in config) {
    console.warn(
      `[mdorigin] ${configFilePath}: "catalogLoadMoreStep" is deprecated. Use "listingLoadMoreStep" instead.`,
    );
  }
}
