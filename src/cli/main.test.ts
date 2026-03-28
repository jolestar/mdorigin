import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cliEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'main.ts',
);
const packageVersion = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'),
    'utf8',
  ),
) as { version: string };

function runCli(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', cliEntry, ...args], {
    encoding: 'utf8',
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'),
  });
}

test('mdorigin --version prints the package version', () => {
  const result = runCli(['--version']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), packageVersion.version);
  assert.equal(result.stderr.trim(), '');
});

test('mdorigin --help prints root usage', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /mdorigin dev --root <content-dir>/);
});

test('mdorigin build --help prints build usage', () => {
  const result = runCli(['build', '--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /mdorigin build index/);
  assert.match(result.stdout, /mdorigin build cloudflare/);
});

test('mdorigin dev --help prints command usage', () => {
  const result = runCli(['dev', '--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: mdorigin dev --root <content-dir>/);
});

test('mdorigin reports unknown commands', () => {
  const result = runCli(['wat']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown command: wat/);
  assert.match(result.stderr, /Usage:/);
});

test('mdorigin build index rejects unknown arguments', () => {
  const result = runCli(['build', 'index', '--wat']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown argument for mdorigin build index: --wat/);
});
