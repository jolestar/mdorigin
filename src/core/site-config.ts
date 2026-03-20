import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface SiteConfig {
  siteTitle?: string;
  showDate?: boolean;
  showSummary?: boolean;
  stylesheet?: string;
}

export interface ResolvedSiteConfig {
  siteTitle: string;
  showDate: boolean;
  showSummary: boolean;
  stylesheetContent?: string;
}

export interface LoadSiteConfigOptions {
  cwd?: string;
  configPath?: string;
}

export async function loadSiteConfig(
  options: LoadSiteConfigOptions = {},
): Promise<ResolvedSiteConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const configFilePath = path.resolve(
    cwd,
    options.configPath ?? 'mdorigin.config.json',
  );

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
    showDate: parsedConfig.showDate ?? true,
    showSummary: parsedConfig.showSummary ?? true,
    stylesheetContent,
  };
}

function isNodeNotFound(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
