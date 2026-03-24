import test from 'node:test';
import assert from 'node:assert/strict';

import { MemoryContentStore } from './content-store.js';
import { handleSiteRequest } from './request-handler.js';
import { resolveRequest } from './router.js';

const TEST_SITE_CONFIG = {
  siteTitle: 'Test Site',
  siteUrl: undefined,
  favicon: undefined,
  logo: undefined,
  showDate: true,
  showSummary: true,
  theme: 'paper' as const,
  template: 'document' as const,
  topNav: [],
  footerNav: [],
  footerText: undefined,
  socialLinks: [],
  editLink: undefined,
  showHomeIndex: true,
  catalogInitialPostCount: 10,
  catalogLoadMoreStep: 10,
  siteTitleConfigured: true,
  siteDescriptionConfigured: false,
};

test('resolveRequest maps html, markdown, default html, index, and assets', () => {
  assert.deepEqual(resolveRequest('/'), {
    kind: 'html',
    requestPath: '/',
    sourcePath: 'index.md',
  });
  assert.deepEqual(resolveRequest('/topic/post'), {
    kind: 'html',
    requestPath: '/topic/post',
    sourcePath: 'topic/post.md',
  });
  assert.deepEqual(resolveRequest('/topic/'), {
    kind: 'html',
    requestPath: '/topic/',
    sourcePath: 'topic/index.md',
  });
  assert.deepEqual(resolveRequest('/topic/index.html'), {
    kind: 'html',
    requestPath: '/topic/index.html',
    sourcePath: 'topic/index.md',
  });
  assert.deepEqual(resolveRequest('/note.md'), {
    kind: 'markdown',
    requestPath: '/note.md',
    sourcePath: 'note.md',
  });
  assert.deepEqual(resolveRequest('/topic/diagram.png'), {
    kind: 'asset',
    requestPath: '/topic/diagram.png',
    sourcePath: 'topic/diagram.png',
  });
});

test('resolveRequest rejects traversal paths', () => {
  assert.equal(resolveRequest('/../secret').kind, 'not-found');
  assert.equal(resolveRequest('/%2E%2E/secret').kind, 'not-found');
});

test('handleSiteRequest renders html and preserves markdown', async () => {
  const store = new MemoryContentStore([
    {
      path: 'topic/index.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Topic Home',
        'summary: Topic summary',
        '---',
        '',
        '# Topic',
        '',
        '![](./diagram.png)',
      ].join('\n'),
    },
    {
      path: 'topic/diagram.png',
      kind: 'binary',
      mediaType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    },
    {
      path: 'topic/post.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['# Post', '', '[Nested](./guide.md)', '', '[Topic Home](./index.md)', '', '[Root Home](../README.md)'].join('\n'),
    },
    {
      path: 'topic/guide.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Guide',
    },
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Home',
    },
  ]);

  const htmlResponse = await handleSiteRequest(store, '/topic/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(htmlResponse.status, 200);
  assert.match(String(htmlResponse.body), /Topic Home/);
  assert.match(String(htmlResponse.body), /<img src="\.\.\/?diagram\.png"|<img src="\.\/diagram\.png"/);

  const markdownResponse = await handleSiteRequest(store, '/topic/index.md', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(markdownResponse.status, 200);
  assert.match(String(markdownResponse.body), /^---/m);

  const defaultHtmlResponse = await handleSiteRequest(store, '/topic/post', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(defaultHtmlResponse.status, 200);
  assert.match(String(defaultHtmlResponse.body), /<h1>Post<\/h1>/);
  assert.match(String(defaultHtmlResponse.body), /Test Site/);
  assert.match(String(defaultHtmlResponse.body), /href="\.\/guide"/);
  assert.match(String(defaultHtmlResponse.body), /href="\.\/"/);
  assert.match(String(defaultHtmlResponse.body), /href="\.\.\/"/);
});

test('handleSiteRequest serves markdown on extensionless routes when accept asks for markdown', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Home', '---', '', '# Home'].join('\n'),
    },
    {
      path: 'topic/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Topic Home', '---', '', '# Topic Home'].join('\n'),
    },
    {
      path: 'topic/post.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Post', '---', '', '# Post'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/topic/post', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
    acceptHeader: 'text/markdown, text/html;q=0.9',
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'text/markdown; charset=utf-8');
  assert.equal(response.headers.vary, 'Accept');
  assert.match(String(response.body), /^---/m);

  const homeResponse = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
    acceptHeader: 'text/markdown',
  });
  assert.equal(homeResponse.status, 200);
  assert.equal(homeResponse.headers['content-type'], 'text/markdown; charset=utf-8');
  assert.equal(homeResponse.headers.vary, 'Accept');
  assert.match(String(homeResponse.body), /^---/m);

  const directoryResponse = await handleSiteRequest(store, '/topic/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
    acceptHeader: 'text/markdown',
  });
  assert.equal(directoryResponse.status, 200);
  assert.equal(
    directoryResponse.headers['content-type'],
    'text/markdown; charset=utf-8',
  );
  assert.equal(directoryResponse.headers.vary, 'Accept');
  assert.match(String(directoryResponse.body), /^---/m);
});

test('handleSiteRequest keeps explicit html routes as html even when markdown is accepted', async () => {
  const store = new MemoryContentStore([
    {
      path: 'topic/post.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Post',
    },
  ]);

  const response = await handleSiteRequest(store, '/topic/post.html', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
    acceptHeader: 'text/markdown, text/html;q=0.9',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(response.headers.vary, undefined);
  assert.match(String(response.body), /<h1>Post<\/h1>/);
});

test('handleSiteRequest filters drafts in exclude mode', async () => {
  const store = new MemoryContentStore([
    {
      path: 'draft.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'draft: true', '---', '', '# Draft'].join('\n'),
    },
  ]);

  const included = await handleSiteRequest(store, '/draft.html', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(included.status, 200);

  const excluded = await handleSiteRequest(store, '/draft.md', {
    draftMode: 'exclude',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(excluded.status, 404);
});

test('handleSiteRequest renders sitemap.xml with canonical html urls', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Home', 'date: 2026-03-20', '---', '', '# Home'].join('\n'),
    },
    {
      path: 'guides/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Guides', 'date: 2026-03-21', '---', '', '# Guides'].join('\n'),
    },
    {
      path: 'posts/hello.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Hello', 'aliases:', '  - /hello-world', '---', '', '# Hello'].join('\n'),
    },
    {
      path: 'draft.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'draft: true', '---', '', '# Draft'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/sitemap.xml', {
    draftMode: 'exclude',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      siteUrl: 'https://example.com',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/xml; charset=utf-8');
  const body = String(response.body);
  assert.match(body, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.match(body, /<loc>https:\/\/example\.com\/guides\/<\/loc>/);
  assert.match(body, /<loc>https:\/\/example\.com\/posts\/hello<\/loc>/);
  assert.doesNotMatch(body, /hello-world/);
  assert.doesNotMatch(body, /draft/);
  assert.match(body, /<lastmod>2026-03-20<\/lastmod>/);
  assert.match(body, /<lastmod>2026-03-21<\/lastmod>/);
});

test('handleSiteRequest returns an error for sitemap.xml when siteUrl is missing', async () => {
  const response = await handleSiteRequest(new MemoryContentStore([]), '/sitemap.xml', {
    draftMode: 'exclude',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 500);
  assert.match(String(response.body), /siteUrl/);
});

test('handleSiteRequest serves OpenAPI schema for search', async () => {
  const response = await handleSiteRequest(
    new MemoryContentStore([]),
    '/api/openapi.json',
    {
      draftMode: 'include',
      siteConfig: TEST_SITE_CONFIG,
      requestUrl: 'https://example.com/api/openapi.json',
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  const body = JSON.parse(String(response.body)) as {
    openapi: string;
    paths: Record<string, unknown>;
  };
  assert.equal(body.openapi, '3.1.0');
  assert.ok('/api/search' in body.paths);
});

test('handleSiteRequest serves search API results', async () => {
  const response = await handleSiteRequest(
    new MemoryContentStore([]),
    '/api/search',
    {
      draftMode: 'include',
      siteConfig: TEST_SITE_CONFIG,
      searchParams: new URLSearchParams({
        q: 'cloudflare deploy',
        topK: '5',
      }),
      searchApi: {
        async search(query, options) {
          assert.equal(query, 'cloudflare deploy');
          assert.equal(options?.topK, 5);
          return [
            {
              docId: '/guides/cloudflare',
              relativePath: 'guides/cloudflare.md',
              canonicalUrl: 'https://example.com/guides/cloudflare',
              title: 'Cloudflare Deployment',
              summary: 'Deploy with Workers.',
              metadata: {},
              score: 0.9,
              bestMatch: {
                chunkId: 1,
                excerpt: 'Build a Worker bundle and deploy it.',
                headingPath: ['Cloudflare Deployment'],
                charStart: 0,
                charEnd: 35,
                score: 0.9,
              },
            },
          ];
        },
      },
    },
  );

  assert.equal(response.status, 200);
  const body = JSON.parse(String(response.body)) as {
    query: string;
    count: number;
    hits: Array<{ title: string }>;
  };
  assert.equal(body.query, 'cloudflare deploy');
  assert.equal(body.count, 1);
  assert.equal(body.hits[0]?.title, 'Cloudflare Deployment');
});

test('handleSiteRequest returns 404 for search API when disabled', async () => {
  const response = await handleSiteRequest(
    new MemoryContentStore([]),
    '/api/search',
    {
      draftMode: 'include',
      siteConfig: TEST_SITE_CONFIG,
      searchParams: new URLSearchParams({ q: 'hello' }),
    },
  );

  assert.equal(response.status, 404);
});

test('handleSiteRequest renders directory listings when index is missing', async () => {
  const store = new MemoryContentStore([
    {
      path: 'topic/post.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Post',
    },
    {
      path: 'topic/subtopic/note.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Note',
    },
    {
      path: 'topic/image.png',
      kind: 'binary',
      mediaType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    },
  ]);

  const response = await handleSiteRequest(store, '/topic/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /href="\/topic\/post"/);
  assert.match(String(response.body), /href="\/topic\/subtopic\/"/);
  assert.doesNotMatch(String(response.body), /image\.png/);
});

test('handleSiteRequest renders README.md as directory homepage fallback', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Root Readme', '---', '', '# Root Readme'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /Root Readme/);
});

test('handleSiteRequest renders SKILL.md as directory homepage fallback', async () => {
  const store = new MemoryContentStore([
    {
      path: 'chrome-devtools/SKILL.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'name: chrome-devtools-mcp-skill',
        'description: Inspect pages and browser state.',
        '---',
        '',
        '# Chrome DevTools MCP Skill',
      ].join('\n'),
    },
  ]);

  const htmlResponse = await handleSiteRequest(store, '/chrome-devtools/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(htmlResponse.status, 200);
  assert.match(String(htmlResponse.body), /Chrome DevTools MCP Skill/);
  assert.match(
    String(htmlResponse.body),
    /<title>chrome-devtools-mcp-skill \| Test Site<\/title>/,
  );

  const markdownResponse = await handleSiteRequest(store, '/chrome-devtools/SKILL.md', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(markdownResponse.status, 200);
  assert.match(String(markdownResponse.body), /^---/m);
});

test('handleSiteRequest redirects alternate directory markdown filenames', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Root Readme', '---', '', '# Root Readme'].join('\n'),
    },
    {
      path: 'guides/index.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Guides', '---', '', '# Guides'].join('\n'),
    },
  ]);

  const rootRedirect = await handleSiteRequest(store, '/index.md', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(rootRedirect.status, 308);
  assert.equal(rootRedirect.headers.location, '/README.md');

  const guidesRedirect = await handleSiteRequest(store, '/guides/README.md', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(guidesRedirect.status, 308);
  assert.equal(guidesRedirect.headers.location, '/guides/index.md');
});

test('handleSiteRequest redirects aliases to canonical html paths', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: '# Home',
    },
    {
      path: 'guides/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'aliases:', '  - /old-guides', '---', '', '# Guides'].join('\n'),
    },
    {
      path: 'posts/hello.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'aliases:', '  - /hello-world', '---', '', '# Hello'].join('\n'),
    },
  ]);

  const directoryAlias = await handleSiteRequest(store, '/old-guides', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(directoryAlias.status, 308);
  assert.equal(directoryAlias.headers.location, '/guides/');

  const articleAlias = await handleSiteRequest(store, '/hello-world', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(articleAlias.status, 308);
  assert.equal(articleAlias.headers.location, '/posts/hello');
});

test('handleSiteRequest does not redirect draft aliases in exclude mode', async () => {
  const store = new MemoryContentStore([
    {
      path: 'draft.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'draft: true', 'aliases:', '  - /old-draft', '---', '', '# Draft'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/old-draft', {
    draftMode: 'exclude',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 404);
});

test('handleSiteRequest derives top navigation from root directories when topNav is empty', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Root Readme', '---', '', '# Root Readme'].join('\n'),
    },
    {
      path: 'guides/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Guides', 'type: page', 'order: 20', '---', '', '# Guides'].join('\n'),
    },
    {
      path: 'reference/index.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Reference', 'type: page', 'order: 30', '---', '', '# Reference'].join('\n'),
    },
    {
      path: 'about/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: About', 'type: page', 'order: 10', '---', '', '# About'].join('\n'),
    },
    {
      path: 'post/README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Post', 'type: post', 'date: 2026-03-20', '---', '', '# Post'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      topNav: [],
      showHomeIndex: true,
    },
  });

  assert.equal(response.status, 200);
  const body = String(response.body);
  assert.ok(body.indexOf('/about/') < body.indexOf('/guides/'));
  assert.ok(body.indexOf('/guides/') < body.indexOf('/reference/'));
  assert.match(String(response.body), /href="\/guides\/"/);
  assert.match(String(response.body), />Guides<\/a>/);
  assert.match(String(response.body), /href="\/reference\/"/);
  assert.match(String(response.body), />Reference<\/a>/);
  assert.doesNotMatch(String(response.body), /href="\/post\/"/);
});

test('handleSiteRequest hides home index block in html when showHomeIndex is false', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Root Readme',
        'summary: Root summary',
        '---',
        '',
        '# Root Readme',
        '',
        'Intro text.',
        '',
        '<!-- INDEX:START -->',
        '',
        '- [About](./about/)',
        '',
        '<!-- INDEX:END -->',
      ].join('\n'),
    },
  ]);

  const htmlResponse = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      topNav: [{ label: 'About', href: '/about/' }],
      showHomeIndex: false,
    },
  });

  assert.equal(htmlResponse.status, 200);
  assert.match(String(htmlResponse.body), /Intro text/);
  assert.match(String(htmlResponse.body), /href="\/about\/"/);
  assert.doesNotMatch(String(htmlResponse.body), /<!-- INDEX:START -->/);

  const markdownResponse = await handleSiteRequest(store, '/README.md', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      topNav: [{ label: 'About', href: '/about/' }],
      showHomeIndex: false,
    },
  });

  assert.match(String(markdownResponse.body), /<!-- INDEX:START -->/);
});

test('handleSiteRequest hides root index entries that are already present in navigation', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Root Readme',
        '---',
        '',
        '# Root Readme',
        '',
        '<!-- INDEX:START -->',
        '',
        '- [Guides](./guides/)',
        '  2026-03-20 · Guides summary.',
        '',
        '- [Why mdorigin exists](./why-mdorigin.md)',
        '  2026-03-20 · Post summary.',
        '',
        '<!-- INDEX:END -->',
      ].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      topNav: [{ label: 'Guides', href: '/guides/' }],
    },
  });

  assert.equal(response.status, 200);
  assert.doesNotMatch(String(response.body), /<a href="\.\/guides\/">Guides<\/a>/);
  assert.match(String(response.body), /Why mdorigin exists/);
});

test('handleSiteRequest respects site config rendering options', async () => {
  const store = new MemoryContentStore([
    {
      path: 'post.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Configured Post',
        'date: 2026-03-20',
        'summary: Hidden summary',
        '---',
        '',
        'Body text',
      ].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/post', {
    draftMode: 'include',
    siteConfig: {
      siteTitle: 'Configured Site',
      siteDescription: 'Configured description',
      siteUrl: 'https://example.com',
      favicon: '/favicon.ico',
      logo: { src: '/logo.svg', alt: 'Configured Site' },
      showDate: false,
      showSummary: false,
      theme: 'atlas',
      template: 'document',
      topNav: [{ label: 'Docs', href: '/docs/' }],
      footerNav: [{ label: 'GitHub', href: 'https://github.com/example/repo' }],
      footerText: 'Footer note',
      socialLinks: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/example/repo' }],
      editLink: { baseUrl: 'https://github.com/example/repo/edit/main/docs/' },
      showHomeIndex: true,
      catalogInitialPostCount: 10,
      catalogLoadMoreStep: 10,
      stylesheetContent: 'body { color: red; }',
      siteTitleConfigured: true,
      siteDescriptionConfigured: true,
    },
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /Configured Site/);
  assert.match(String(response.body), /Configured description/);
  assert.match(String(response.body), /data-theme="atlas"/);
  assert.match(String(response.body), /href="\/docs\/"/);
  assert.doesNotMatch(String(response.body), /href="\/guides\/"/);
  assert.match(String(response.body), /body \{ color: red; \}/);
  assert.match(String(response.body), /rel="canonical" href="https:\/\/example\.com\/post"/);
  assert.match(String(response.body), /rel="icon" href="\/favicon\.ico"/);
  assert.match(
    String(response.body),
    /rel="alternate" type="text\/markdown" href="\/post\.md"/,
  );
  assert.match(String(response.body), /<img src="\/logo\.svg" alt="Configured Site">/);
  assert.match(String(response.body), /site-footer__nav/);
  assert.match(String(response.body), /Footer note/);
  assert.match(String(response.body), /Edit this page/);
  assert.doesNotMatch(String(response.body), /Hidden summary/);
  assert.doesNotMatch(String(response.body), /2026-03-20/);
});

test('handleSiteRequest uses skill metadata fallbacks and serves script files as text', async () => {
  const store = new MemoryContentStore([
    {
      path: 'skill/SKILL.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'name: find-skills',
        'description: Discover skills from the ecosystem.',
        '---',
        '',
        '# Find Skills',
        '',
        'This skill helps you discover installable skills.',
      ].join('\n'),
    },
    {
      path: 'skill/scripts/install.sh',
      kind: 'text',
      mediaType: 'text/plain; charset=utf-8',
      text: '#!/usr/bin/env bash\necho install\n',
    },
  ]);

  const response = await handleSiteRequest(store, '/skill/', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /Discover skills from the ecosystem\./);
  assert.match(String(response.body), /<title>find-skills \| Test Site<\/title>/);

  const scriptResponse = await handleSiteRequest(store, '/skill/scripts/install.sh', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });
  assert.equal(scriptResponse.status, 200);
  assert.equal(scriptResponse.headers['content-type'], 'text/plain; charset=utf-8');
  assert.match(String(scriptResponse.body), /echo install/);
});

test('handleSiteRequest renders yaml dates parsed as Date objects', async () => {
  const store = new MemoryContentStore([
    {
      path: 'dated.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: ['---', 'title: Dated Post', 'date: 2026-03-20', '---', '', '# Dated'].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/dated', {
    draftMode: 'include',
    siteConfig: TEST_SITE_CONFIG,
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /<title>Dated Post \| Test Site<\/title>/);
  assert.match(String(response.body), /<h1>Dated<\/h1>/);
});

test('handleSiteRequest renders managed index blocks with catalog layout', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Catalog Home',
        '---',
        '',
        '# Catalog Home',
        '',
        'Body paragraph.',
        '',
        '## Start Here',
        '',
        '- [Manual Link](./guides/)',
        '',
        '<!-- INDEX:START -->',
        '',
        '- [Guides](./guides/)',
        '',
        '- [Reference](./reference/)',
        '',
        '- [Why mdorigin exists](./why-mdorigin.md)',
        '  2026-03-20 · A concise explanation of the project.',
        '',
        '<!-- INDEX:END -->',
      ].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      template: 'catalog',
    },
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /data-template="catalog"/);
  assert.match(String(response.body), /<h1>Catalog Home<\/h1>/);
  assert.equal((String(response.body).match(/<h1/g) ?? []).length, 1);
  assert.match(String(response.body), /Body paragraph\./);
  assert.match(String(response.body), /<a class="catalog-item catalog-item--directory" href="\.\/guides\/">/);
  assert.match(String(response.body), /<a class="catalog-item catalog-item--directory" href="\.\/reference\/">/);
  assert.match(String(response.body), /<a class="catalog-item" href="\.\/why-mdorigin">/);
  assert.match(String(response.body), /A concise explanation of the project\./);
  assert.match(String(response.body), /<li><a href="\.\/guides\/">Manual Link<\/a><\/li>/);
  assert.doesNotMatch(String(response.body), /<li><a href="\.\/reference\/">Reference<\/a><\/li>/);
  assert.doesNotMatch(String(response.body), /Directory<\/span>/);
});

test('handleSiteRequest loads additional catalog articles in batches', async () => {
  const store = new MemoryContentStore([
    {
      path: 'README.md',
      kind: 'text',
      mediaType: 'text/markdown; charset=utf-8',
      text: [
        '---',
        'title: Catalog Home',
        '---',
        '',
        '# Catalog Home',
        '',
        '<!-- INDEX:START -->',
        '',
        '- [First](./first.md)',
        '  First detail.',
        '',
        '- [Second](./second.md)',
        '  Second detail.',
        '',
        '- [Third](./third.md)',
        '  Third detail.',
        '',
        '<!-- INDEX:END -->',
      ].join('\n'),
    },
  ]);

  const response = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      template: 'catalog',
      catalogInitialPostCount: 1,
      catalogLoadMoreStep: 1,
    },
  });

  assert.equal(response.status, 200);
  const body = String(response.body);
  assert.match(body, /First/);
  assert.doesNotMatch(body, /Second detail\./);
  assert.match(body, /data-catalog-load-more/);

  const fragmentResponse = await handleSiteRequest(store, '/', {
    draftMode: 'include',
    siteConfig: {
      ...TEST_SITE_CONFIG,
      template: 'catalog',
      catalogInitialPostCount: 1,
      catalogLoadMoreStep: 1,
    },
    searchParams: new URLSearchParams({
      'catalog-format': 'posts',
      'catalog-offset': '1',
      'catalog-limit': '1',
    }),
  });

  assert.equal(fragmentResponse.status, 200);
  assert.equal(
    fragmentResponse.headers['content-type'],
    'application/json; charset=utf-8',
  );
  const payload = JSON.parse(String(fragmentResponse.body)) as {
    itemsHtml: string;
    hasMore: boolean;
    nextOffset: number;
  };
  assert.match(payload.itemsHtml, /Second/);
  assert.equal(payload.hasMore, true);
  assert.equal(payload.nextOffset, 2);
});
