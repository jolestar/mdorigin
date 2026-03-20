import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildDirectoryIndexes,
  buildManagedIndexBlock,
  upsertManagedIndexBlock,
} from './index-builder.js';

test('buildManagedIndexBlock renders directories and articles with sorting', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-index-block-'));
  await mkdir(path.join(rootDir, 'zeta'));
  await writeFile(
    path.join(rootDir, 'zeta', 'index.md'),
    ['---', 'title: Zeta Notes', '---', '', '# Zeta'].join('\n'),
    'utf8',
  );
  await mkdir(path.join(rootDir, 'alpha'));
  await writeFile(
    path.join(rootDir, 'alpha', 'index.md'),
    ['---', 'title: Alpha Notes', 'type: page', '---', '', '# Alpha'].join('\n'),
    'utf8',
  );
  await mkdir(path.join(rootDir, 'essay'));
  await writeFile(
    path.join(rootDir, 'essay', 'README.md'),
    [
      '---',
      'title: Directory Essay',
      'type: post',
      'date: 2025-04-05',
      'summary: Essay summary',
      '---',
      '',
      '# Essay',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'old.md'),
    ['---', 'title: Old Post', 'date: 2024-01-03', 'summary: Old summary', '---', '', '# Old'].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'new.md'),
    ['---', 'title: New Post', 'date: 2025-03-04', '---', '', 'First paragraph summary.', '', '# Heading later'].join('\n'),
    'utf8',
  );
  await writeFile(path.join(rootDir, 'index.md'), '# Root\n', 'utf8');

  const block = await buildManagedIndexBlock(rootDir);

  assert.match(block, /\[Alpha Notes\]\(\.\/alpha\/\)[\s\S]*\[Zeta Notes\]\(\.\/zeta\/\)/);
  assert.match(block, /\[Directory Essay\]\(\.\/essay\/\)[\s\S]*2025-04-05 · Essay summary/);
  assert.match(block, /\[New Post\]\(\.\/new\.md\)[\s\S]*2025-03-04 · First paragraph summary\./);
  assert.match(block, /\[Old Post\]\(\.\/old\.md\)[\s\S]*2024-01-03 · Old summary/);
  assert.ok(block.indexOf('Directory Essay') < block.indexOf('New Post'));
  assert.ok(block.indexOf('New Post') < block.indexOf('Old Post'));
});

test('upsertManagedIndexBlock replaces existing managed section', () => {
  const source = [
    '# Writing',
    '',
    '<!-- INDEX:START -->',
    'Old content',
    '<!-- INDEX:END -->',
    '',
    'Trailing note',
  ].join('\n');

  const updated = upsertManagedIndexBlock(
    source,
    ['<!-- INDEX:START -->', '', '- [Post](./post.md)', '', '<!-- INDEX:END -->'].join('\n'),
  );

  assert.doesNotMatch(updated, /Old content/);
  assert.match(updated, /Trailing note/);
  assert.match(updated, /\[Post\]\(\.\/post\.md\)/);
});

test('upsertManagedIndexBlock appends markers when missing', () => {
  const updated = upsertManagedIndexBlock('# Writing\n\nIntro text.\n', '<!-- INDEX:START -->\n\n<!-- INDEX:END -->');
  assert.match(updated, /Intro text\.\n\n<!-- INDEX:START -->/);
  assert.match(updated, /<!-- INDEX:END -->\n$/);
});

test('buildManagedIndexBlock leaves empty directories blank', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-index-empty-'));
  await writeFile(path.join(rootDir, 'README.md'), '# Empty\n', 'utf8');

  const block = await buildManagedIndexBlock(rootDir);

  assert.equal(block, ['<!-- INDEX:START -->', '', '<!-- INDEX:END -->'].join('\n'));
});

test('buildDirectoryIndexes updates existing index files recursively', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-index-build-'));
  await writeFile(path.join(rootDir, 'index.md'), '# Root\n', 'utf8');
  await mkdir(path.join(rootDir, 'posts'));
  await writeFile(path.join(rootDir, 'posts', 'index.md'), '# Posts\n', 'utf8');
  await writeFile(
    path.join(rootDir, 'posts', 'hello.md'),
    ['---', 'title: Hello', 'summary: Greeting', '---', '', '# Hello'].join('\n'),
    'utf8',
  );
  await mkdir(path.join(rootDir, 'drafts'));
  await writeFile(
    path.join(rootDir, 'drafts', 'note.md'),
    ['---', 'draft: true', '---', '', '# Draft'].join('\n'),
    'utf8',
  );

  const result = await buildDirectoryIndexes({ rootDir });

  assert.equal(result.updatedFiles.length, 2);
  assert.ok(result.skippedDirectories.some((entry) => entry.endsWith('/drafts')));

  const rootIndex = await readFile(path.join(rootDir, 'index.md'), 'utf8');
  assert.match(rootIndex, /\[posts\]\(\.\/posts\/\)/i);

  const postsIndex = await readFile(path.join(rootDir, 'posts', 'index.md'), 'utf8');
  assert.match(postsIndex, /\[Hello\]\(\.\/hello\.md\)/);
  assert.doesNotMatch(postsIndex, /draft/i);
});

test('buildDirectoryIndexes updates README.md when index.md is missing', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'mdorigin-index-readme-'));
  await writeFile(path.join(rootDir, 'README.md'), '# Docs Home\n', 'utf8');
  await writeFile(
    path.join(rootDir, 'getting-started.md'),
    ['---', 'title: Getting Started', '---', '', '# Getting Started'].join('\n'),
    'utf8',
  );

  const result = await buildDirectoryIndexes({ dir: rootDir });

  assert.equal(result.updatedFiles.length, 1);
  assert.ok(result.updatedFiles[0]?.endsWith('README.md'));

  const readme = await readFile(path.join(rootDir, 'README.md'), 'utf8');
  assert.match(readme, /<!-- INDEX:START -->/);
  assert.match(readme, /\[Getting Started\]\(\.\/getting-started\.md\)/);
});
