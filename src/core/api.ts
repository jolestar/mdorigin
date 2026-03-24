import type { ResolvedSiteConfig } from './site-config.js';
import type { SearchApi, SearchHit } from '../search.js';

export interface ApiRouteOptions {
  searchApi?: SearchApi;
  siteConfig: ResolvedSiteConfig;
  requestUrl?: string;
}

export interface ApiRouteResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export async function handleApiRoute(
  pathname: string,
  searchParams: URLSearchParams | undefined,
  options: ApiRouteOptions,
): Promise<ApiRouteResponse | null> {
  if (pathname === '/api/openapi.json') {
    return json(200, buildOpenApiDocument(options));
  }

  if (pathname === '/api/search') {
    if (!options.searchApi) {
      return json(404, { error: 'search is not enabled for this site' });
    }

    const query = searchParams?.get('q')?.trim() ?? '';
    if (query === '') {
      return json(400, {
        error: 'missing required query parameter: q',
      });
    }

    const topK = normalizePositiveInteger(searchParams?.get('topK')) ?? 10;
    const hits = await options.searchApi.search(query, { topK });
    return json(200, {
      query,
      topK,
      count: hits.length,
      hits: hits.map(serializeSearchHit),
    });
  }

  return null;
}

function buildOpenApiDocument(options: ApiRouteOptions) {
  return {
    openapi: '3.1.0',
    info: {
      title: `${options.siteConfig.siteTitle} API`,
      version: '1.0.0',
      description: 'Search API for a mdorigin site.',
    },
    servers: options.siteConfig.siteUrl
      ? [{ url: options.siteConfig.siteUrl }]
      : options.requestUrl
        ? [{ url: new URL(options.requestUrl).origin }]
        : undefined,
    paths: {
      '/api/search': {
        get: {
          operationId: 'searchSite',
          summary: 'Search published site content',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Search query string.',
            },
            {
              name: 'topK',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 10 },
              description: 'Maximum number of hits to return.',
            },
          ],
          responses: {
            '200': {
              description: 'Search results.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['query', 'topK', 'count', 'hits'],
                    properties: {
                      query: { type: 'string' },
                      topK: { type: 'integer' },
                      count: { type: 'integer' },
                      hits: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: [
                            'docId',
                            'relativePath',
                            'score',
                            'metadata',
                            'bestMatch',
                          ],
                          properties: {
                            docId: { type: 'string' },
                            relativePath: { type: 'string' },
                            canonicalUrl: { type: 'string' },
                            title: { type: 'string' },
                            summary: { type: 'string' },
                            score: { type: 'number' },
                            metadata: { type: 'object', additionalProperties: true },
                            bestMatch: {
                              type: 'object',
                              required: [
                                'chunkId',
                                'excerpt',
                                'headingPath',
                                'charStart',
                                'charEnd',
                                'score',
                              ],
                              properties: {
                                chunkId: { type: 'number' },
                                excerpt: { type: 'string' },
                                headingPath: {
                                  type: 'array',
                                  items: { type: 'string' },
                                },
                                charStart: { type: 'integer' },
                                charEnd: { type: 'integer' },
                                score: { type: 'number' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request.',
            },
            '404': {
              description: 'Search API not enabled.',
            },
          },
        },
      },
    },
  };
}

function serializeSearchHit(hit: SearchHit) {
  return {
    docId: hit.docId,
    relativePath: hit.relativePath,
    canonicalUrl: hit.canonicalUrl,
    title: hit.title,
    summary: hit.summary,
    metadata: hit.metadata,
    score: hit.score,
    bestMatch: hit.bestMatch,
  };
}

function normalizePositiveInteger(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function json(status: number, body: unknown): ApiRouteResponse {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body, null, 2),
  };
}
