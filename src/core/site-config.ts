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

export interface SiteConfig {
  siteTitle?: string;
  siteDescription?: string;
  showDate?: boolean;
  showSummary?: boolean;
  stylesheet?: string;
  theme?: BuiltInThemeName;
  template?: TemplateName;
  topNav?: SiteNavItem[];
  showHomeIndex?: boolean;
}

export interface ResolvedSiteConfig {
  siteTitle: string;
  siteDescription?: string;
  showDate: boolean;
  showSummary: boolean;
  theme: BuiltInThemeName;
  template: TemplateName;
  topNav: SiteNavItem[];
  showHomeIndex: boolean;
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
    showDate: parsedConfig.showDate ?? true,
    showSummary: parsedConfig.showSummary ?? true,
    theme: isBuiltInThemeName(parsedConfig.theme) ? parsedConfig.theme : 'paper',
    template: isTemplateName(parsedConfig.template) ? parsedConfig.template : 'document',
    topNav: normalizeTopNav(parsedConfig.topNav),
    showHomeIndex:
      typeof parsedConfig.showHomeIndex === 'boolean'
        ? parsedConfig.showHomeIndex
        : normalizeTopNav(parsedConfig.topNav).length === 0,
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
      return [{ label: item.label, href: item.href }];
    }

    return [];
  });
}
