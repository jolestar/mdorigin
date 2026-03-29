import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMarkdownDocument, renderMarkdown, rewriteMarkdownLinksInHtml } from './markdown.js';

test('renderMarkdown preserves trusted raw html media tags', async () => {
  const html = await renderMarkdown([
    'Intro paragraph.',
    '',
    '<video controls preload="metadata" src="./clip.mp4"></video>',
    '',
    '<details><summary>More</summary><p>Hidden body</p></details>',
  ].join('\n'));

  assert.match(html, /<video controls(?:="")? preload="metadata" src="\.\/clip\.mp4"><\/video>/);
  assert.match(html, /<details><summary>More<\/summary><p>Hidden body<\/p><\/details>/);
});

test('parseMarkdownDocument preserves raw html and still rewrites markdown links', async () => {
  const parsed = await parseMarkdownDocument(
    'posts/example.md',
    [
      '# Example',
      '',
      '[Guide](./guide.md)',
      '',
      '<video controls src="./clip.mp4"></video>',
    ].join('\n'),
  );

  assert.match(parsed.html, /href="\.\/guide"/);
  assert.match(parsed.html, /<video controls(?:="")? src="\.\/clip\.mp4"><\/video>/);
});

test('rewriteMarkdownLinksInHtml does not rewrite raw html media src attributes', () => {
  const rewritten = rewriteMarkdownLinksInHtml(
    '<video controls src="./clip.mp4"></video><a href="./guide.md">Guide</a>',
  );

  assert.match(rewritten, /<video controls src="\.\/clip\.mp4"><\/video>/);
  assert.match(rewritten, /<a href="\.\/guide">Guide<\/a>/);
});
