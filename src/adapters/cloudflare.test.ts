import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudflareWorker } from './cloudflare.js';

test('cloudflare worker serves html and hides drafts', async () => {
  const worker = createCloudflareWorker({
    siteConfig: {
      siteTitle: 'Worker Test',
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
      stylesheetContent: 'body { font-family: serif; }',
      siteTitleConfigured: true,
      siteDescriptionConfigured: false,
    },
    entries: [
      {
        path: 'index.md',
        kind: 'text',
        mediaType: 'text/markdown; charset=utf-8',
        text: '# Hello',
      },
      {
        path: 'draft.md',
        kind: 'text',
        mediaType: 'text/markdown; charset=utf-8',
        text: ['---', 'draft: true', '---', '', '# Draft'].join('\n'),
      },
      {
        path: 'posts/foo.md',
        kind: 'text',
        mediaType: 'text/markdown; charset=utf-8',
        text: '# Foo',
      },
      {
        path: 'browse/entry.md',
        kind: 'text',
        mediaType: 'text/markdown; charset=utf-8',
        text: '# Entry',
      },
      {
        path: 'browse/nested/note.md',
        kind: 'text',
        mediaType: 'text/markdown; charset=utf-8',
        text: '# Note',
      },
    ],
  });

  const homeResponse = await worker.fetch(new Request('https://example.com/'));
  assert.equal(homeResponse.status, 200);
  const homeHtml = await homeResponse.text();
  assert.match(homeHtml, /<h1>Hello<\/h1>/);
  assert.match(homeHtml, /Worker Test/);
  assert.match(homeHtml, /font-family: serif/);

  const draftResponse = await worker.fetch(
    new Request('https://example.com/draft.html'),
  );
  assert.equal(draftResponse.status, 404);

  const defaultRouteResponse = await worker.fetch(
    new Request('https://example.com/posts/foo'),
  );
  assert.equal(defaultRouteResponse.status, 200);
  assert.match(await defaultRouteResponse.text(), /<h1>Foo<\/h1>/);

  const listingResponse = await worker.fetch(
    new Request('https://example.com/browse/'),
  );
  assert.equal(listingResponse.status, 200);
  assert.match(await listingResponse.text(), /href="\/browse\/entry"/);
});

test('cloudflare worker supports page render plugins', async () => {
  const worker = createCloudflareWorker(
    {
      siteConfig: {
        siteTitle: 'Worker Test',
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
        siteTitleConfigured: true,
        siteDescriptionConfigured: false,
      },
      entries: [
        {
          path: 'README.md',
          kind: 'text',
          mediaType: 'text/markdown; charset=utf-8',
          text: '# Hello',
        },
      ],
    },
    {
      plugins: [
        {
          renderPage(page) {
            return `<html><body><main class="worker-plugin">${page.title}</main></body></html>`;
          },
        },
      ],
    },
  );

  const response = await worker.fetch(new Request('https://example.com/'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /class="worker-plugin"/);
});

test('cloudflare worker serves assets-backed binaries through ASSETS binding', async () => {
  const worker = createCloudflareWorker({
    siteConfig: {
      siteTitle: 'Worker Test',
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
      siteTitleConfigured: true,
      siteDescriptionConfigured: false,
    },
    runtime: {
      binaryMode: 'external',
    },
    entries: [
      {
        path: 'images/cat.png',
        kind: 'binary',
        mediaType: 'image/png',
        storageKind: 'assets',
        storageKey: 'images/cat.png',
        byteSize: 3,
      },
    ],
  });

  const response = await worker.fetch(
    new Request('https://example.com/images/cat.png'),
    {
      ASSETS: {
        fetch: async () => new Response(Uint8Array.from([1, 2, 3]), {
          headers: { 'content-type': 'image/png' },
        }),
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    Array.from(new Uint8Array(await response.arrayBuffer())),
    [1, 2, 3],
  );
});

test('cloudflare worker serves r2-backed binaries through configured bucket binding', async () => {
  const worker = createCloudflareWorker({
    siteConfig: {
      siteTitle: 'Worker Test',
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
      siteTitleConfigured: true,
      siteDescriptionConfigured: false,
    },
    runtime: {
      binaryMode: 'external',
      r2Binding: 'MDORIGIN_R2',
    },
    entries: [
      {
        path: 'videos/demo.mp4',
        kind: 'binary',
        mediaType: 'video/mp4',
        storageKind: 'r2',
        storageKey: 'binary/abcd.mp4',
        byteSize: 4,
      },
    ],
  });

  const response = await worker.fetch(
    new Request('https://example.com/videos/demo.mp4'),
    {
      MDORIGIN_R2: {
        get: async () => ({
          body: null,
          arrayBuffer: async () => Uint8Array.from([4, 5, 6, 7]).buffer,
        }),
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    Array.from(new Uint8Array(await response.arrayBuffer())),
    [4, 5, 6, 7],
  );
});
