import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudflareWorker } from './cloudflare.js';

test('cloudflare worker serves html and hides drafts', async () => {
  const worker = createCloudflareWorker({
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
    ],
  });

  const homeResponse = await worker.fetch(new Request('https://example.com/'));
  assert.equal(homeResponse.status, 200);
  assert.match(await homeResponse.text(), /<h1>Hello<\/h1>/);

  const draftResponse = await worker.fetch(
    new Request('https://example.com/draft.html'),
  );
  assert.equal(draftResponse.status, 404);

  const defaultRouteResponse = await worker.fetch(
    new Request('https://example.com/posts/foo'),
  );
  assert.equal(defaultRouteResponse.status, 200);
  assert.match(await defaultRouteResponse.text(), /<h1>Foo<\/h1>/);
});
