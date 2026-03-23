import {
  MemoryContentStore,
  type ContentEntry,
  type ContentEntryKind,
} from '../core/content-store.js';
import { handleSiteRequest } from '../core/request-handler.js';
import type { ResolvedSiteConfig } from '../core/site-config.js';

export interface CloudflareManifestEntry {
  path: string;
  kind: ContentEntryKind;
  mediaType: string;
  text?: string;
  base64?: string;
}

export interface CloudflareManifest {
  entries: CloudflareManifestEntry[];
  siteConfig?: ResolvedSiteConfig;
}

export interface ExportedHandlerLike {
  fetch(request: Request): Promise<Response>;
}

export function createCloudflareWorker(
  manifest: CloudflareManifest,
): ExportedHandlerLike {
  const store = new MemoryContentStore(
    manifest.entries.map((entry): ContentEntry => {
      if (entry.kind === 'text') {
        return {
          path: entry.path,
          kind: 'text',
          mediaType: entry.mediaType,
          text: entry.text ?? '',
        };
      }

      return {
        path: entry.path,
        kind: 'binary',
        mediaType: entry.mediaType,
        bytes: decodeBase64(entry.base64 ?? ''),
      };
    }),
  );

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const siteResponse = await handleSiteRequest(store, url.pathname, {
        draftMode: 'exclude',
        siteConfig: manifest.siteConfig ?? {
          siteTitle: 'mdorigin',
          siteUrl: undefined,
          favicon: undefined,
          logo: undefined,
          showDate: true,
          showSummary: true,
          theme: 'paper',
          template: 'document',
          topNav: [],
          footerNav: [],
          footerText: undefined,
          socialLinks: [],
          editLink: undefined,
          showHomeIndex: true,
          catalogInitialPostCount: 10,
          catalogLoadMoreStep: 10,
          siteTitleConfigured: false,
          siteDescriptionConfigured: false,
        },
        acceptHeader: request.headers.get('accept') ?? undefined,
        searchParams: url.searchParams,
      });

      const headers = new Headers(siteResponse.headers);
      const body =
        siteResponse.body instanceof Uint8Array
          ? new Blob([Uint8Array.from(siteResponse.body)], {
              type: siteResponse.headers['content-type'],
            })
          : siteResponse.body ?? '';

      return new Response(body, {
        status: siteResponse.status,
        headers,
      });
    },
  };
}

function decodeBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
