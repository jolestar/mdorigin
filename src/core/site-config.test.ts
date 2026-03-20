import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadSiteConfig } from './site-config.js';

test('loadSiteConfig prefers content root config over cwd config', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'mdorigin-config-cwd-'));
  const rootDir = path.join(cwd, 'docs', 'site');
  await mkdir(rootDir, { recursive: true });

  await writeFile(
    path.join(cwd, 'mdorigin.config.json'),
    JSON.stringify({ siteTitle: 'cwd-title', theme: 'paper' }, null, 2),
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'mdorigin.config.json'),
    JSON.stringify({ siteTitle: 'root-title', theme: 'gazette' }, null, 2),
    'utf8',
  );

  const config = await loadSiteConfig({ cwd, rootDir });

  assert.equal(config.siteTitle, 'root-title');
  assert.equal(config.theme, 'gazette');
});
