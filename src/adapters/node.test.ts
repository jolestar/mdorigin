import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createNodeServer } from './node.js';

test('node server serves markdown, html, and assets', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-'));
  await mkdir(path.join(rootDir, 'topic'));
  await writeFile(
    path.join(rootDir, 'topic', 'index.md'),
    ['---', 'title: Topic', '---', '', '# Topic'].join('\n'),
    'utf8',
  );
  await writeFile(path.join(rootDir, 'topic', 'post.md'), '# Post\n', 'utf8');
  await writeFile(path.join(rootDir, 'topic', 'notes.pdf'), Buffer.from([1, 2]));
  await mkdir(path.join(rootDir, 'browse'));
  await mkdir(path.join(rootDir, 'browse', 'nested'));
  await writeFile(path.join(rootDir, 'browse', 'entry.md'), '# Entry\n', 'utf8');

  const server = createNodeServer({
    rootDir,
    draftMode: 'include',
    siteConfig: {
      siteTitle: 'Node Test',
      showDate: true,
      showSummary: true,
    },
  });

  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected TCP server address');
  }

  try {
    const htmlResponse = await fetch(`http://127.0.0.1:${address.port}/topic/`);
    assert.equal(htmlResponse.status, 200);
    assert.match(await htmlResponse.text(), /<h1>Topic<\/h1>/);

    const markdownResponse = await fetch(
      `http://127.0.0.1:${address.port}/topic/index.md`,
    );
    assert.equal(markdownResponse.status, 200);
    assert.match(await markdownResponse.text(), /title: Topic/);

    const defaultHtmlResponse = await fetch(
      `http://127.0.0.1:${address.port}/topic/post`,
    );
    assert.equal(defaultHtmlResponse.status, 200);
    assert.match(await defaultHtmlResponse.text(), /<h1>Post<\/h1>/);

    const assetResponse = await fetch(
      `http://127.0.0.1:${address.port}/topic/notes.pdf`,
    );
    assert.equal(assetResponse.status, 200);
    assert.equal(assetResponse.headers.get('content-type'), 'application/pdf');

    const listingResponse = await fetch(
      `http://127.0.0.1:${address.port}/browse/`,
    );
    assert.equal(listingResponse.status, 200);
    const listingHtml = await listingResponse.text();
    assert.match(listingHtml, /href="\/browse\/entry"/);
    assert.match(listingHtml, /href="\/browse\/nested\/"/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
