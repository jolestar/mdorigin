import type { ManagedIndexEntry } from './markdown.js';
import type {
  EditLinkConfig,
  ResolvedSiteConfig,
  SiteLogo,
  SiteNavItem,
  SiteSocialLink,
} from './site-config.js';
import type { TemplateName } from '../html/template-kind.js';
import type { BuiltInThemeName } from '../html/theme.js';

type MaybePromise<T> = T | Promise<T>;

export interface IndexTransformContext {
  mode: 'build' | 'render';
  directoryPath?: string;
  requestPath?: string;
  sourcePath?: string;
  siteConfig?: ResolvedSiteConfig;
}

export interface PageRenderModel {
  kind: 'document' | 'catalog';
  requestPath: string;
  sourcePath: string;
  siteTitle: string;
  siteDescription?: string;
  siteUrl?: string;
  favicon?: string;
  socialImage?: string;
  logo?: SiteLogo;
  title: string;
  bodyHtml: string;
  summary?: string;
  date?: string;
  showSummary: boolean;
  showDate: boolean;
  theme: BuiltInThemeName;
  template: TemplateName;
  topNav: SiteNavItem[];
  footerNav: SiteNavItem[];
  footerText?: string;
  socialLinks: SiteSocialLink[];
  editLink?: EditLinkConfig;
  editLinkHref?: string;
  stylesheetContent?: string;
  canonicalPath?: string;
  alternateMarkdownPath?: string;
  catalogEntries: ManagedIndexEntry[];
  catalogRequestPath: string;
  catalogInitialPostCount: number;
  catalogLoadMoreStep: number;
  searchEnabled: boolean;
}

export interface RenderHookContext {
  page: PageRenderModel;
  siteConfig: ResolvedSiteConfig;
}

export interface MdoPlugin {
  name?: string;
  transformIndex?(
    entries: ManagedIndexEntry[],
    context: IndexTransformContext,
  ): MaybePromise<ManagedIndexEntry[]>;
  renderHeader?(context: RenderHookContext): MaybePromise<string | undefined | null>;
  renderFooter?(context: RenderHookContext): MaybePromise<string | undefined | null>;
  renderPage?(
    page: PageRenderModel,
    context: RenderHookContext,
    next: (page: PageRenderModel) => MaybePromise<string>,
  ): MaybePromise<string | undefined | null>;
  transformHtml?(html: string, context: RenderHookContext): MaybePromise<string>;
}

export async function applyIndexTransforms(
  entries: ManagedIndexEntry[],
  plugins: MdoPlugin[],
  context: IndexTransformContext,
): Promise<ManagedIndexEntry[]> {
  let current = [...entries];
  for (const plugin of plugins) {
    if (!plugin.transformIndex) {
      continue;
    }

    current = [...(await plugin.transformIndex(current, context))];
  }

  return current;
}

export async function renderHeaderOverride(
  plugins: MdoPlugin[],
  context: RenderHookContext,
): Promise<string | undefined> {
  let rendered: string | undefined;
  for (const plugin of plugins) {
    if (!plugin.renderHeader) {
      continue;
    }

    const value = await plugin.renderHeader(context);
    if (typeof value === 'string') {
      rendered = value;
    }
  }

  return rendered;
}

export async function renderFooterOverride(
  plugins: MdoPlugin[],
  context: RenderHookContext,
): Promise<string | undefined> {
  let rendered: string | undefined;
  for (const plugin of plugins) {
    if (!plugin.renderFooter) {
      continue;
    }

    const value = await plugin.renderFooter(context);
    if (typeof value === 'string') {
      rendered = value;
    }
  }

  return rendered;
}

export async function renderPageWithPlugins(
  page: PageRenderModel,
  plugins: MdoPlugin[],
  context: RenderHookContext,
  renderDefault: (page: PageRenderModel) => MaybePromise<string>,
): Promise<string> {
  const renderers = plugins
    .map((plugin) => plugin.renderPage)
    .filter((renderPage): renderPage is NonNullable<MdoPlugin['renderPage']> =>
      typeof renderPage === 'function',
    );

  const dispatch = async (index: number, currentPage: PageRenderModel): Promise<string> => {
    const renderPage = renderers[index];
    if (!renderPage) {
      return renderDefault(currentPage);
    }

    const next = (nextPage: PageRenderModel) => dispatch(index + 1, nextPage);
    const rendered = await renderPage(currentPage, context, next);
    if (typeof rendered === 'string') {
      return rendered;
    }

    return next(currentPage);
  };

  return dispatch(0, page);
}

export async function transformHtmlWithPlugins(
  html: string,
  plugins: MdoPlugin[],
  context: RenderHookContext,
): Promise<string> {
  let current = html;
  for (const plugin of plugins) {
    if (!plugin.transformHtml) {
      continue;
    }

    current = await plugin.transformHtml(current, context);
  }

  return current;
}
