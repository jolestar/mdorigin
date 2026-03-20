import test from 'node:test';
import assert from 'node:assert/strict';

import { MemoryContentStore } from './content-store.js';
import { handleSiteRequest } from './request-handler.js';
import { resolveRequest } from './router.js';

const TEST_SITE_CONFIG = {
  siteTitle: 'Test Site',
  showDate: true,
  showSummary: true,
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
      text: '# Post',
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
      showDate: false,
      showSummary: false,
      stylesheetContent: 'body { color: red; }',
    },
  });

  assert.equal(response.status, 200);
  assert.match(String(response.body), /Configured Site/);
  assert.match(String(response.body), /<style>body \{ color: red; \}<\/style>/);
  assert.doesNotMatch(String(response.body), /Hidden summary/);
  assert.doesNotMatch(String(response.body), /2026-03-20/);
});
