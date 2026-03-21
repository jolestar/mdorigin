import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudflareWorker } from './cloudflare.js';

test('cloudflare worker serves html and hides drafts', async () => {
  const worker = createCloudflareWorker({
    siteConfig: {
      siteTitle: 'Worker Test',
      showDate: true,
      showSummary: true,
      theme: 'paper',
      template: 'document',
      topNav: [],
      showHomeIndex: true,
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
