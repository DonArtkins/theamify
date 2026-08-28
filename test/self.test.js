import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compareVersions, NPM_NAME, BIN_NAME, cleanRcMarkers } from '../src/lib/self.js';

test('NPM_NAME and BIN_NAME are correct', () => {
  assert.equal(NPM_NAME, 'theamify-cli');
  assert.equal(BIN_NAME, 'theamify');
});

test('compareVersions orders versions correctly', () => {
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1, 'older vs newer');
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1, 'newer vs older');
  assert.equal(compareVersions('1.0.1', '1.0.1'), 0, 'equal');
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0, 'equal same');
  assert.equal(compareVersions('2.1.1', '2.1.0'), 1, 'patch bump is newer');
  assert.equal(compareVersions('2.0.0', '1.9.9'), 1, 'major dominates');
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1, 'minor dominates');
});

test('compareVersions tolerates missing/partial versions', () => {
  assert.equal(compareVersions('', '1.0.0'), -1);
  assert.equal(compareVersions('1.0.0', ''), 1);
  assert.equal(compareVersions(null, null), 0);
  assert.equal(compareVersions('1.0', '1.0.0'), 0, 'partial treated as 0-padded');
});

test('cleanRcMarkers strips theamify PATH marker and its export PATH line', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'self-home-'));
  const rc = path.join(home, '.bashrc');
  fs.writeFileSync(rc, [
    'export FOO=bar',
    '# theamify CLI PATH',
    'export PATH=/home/artkins/.local/bin:$PATH',
    'export BAZ=qux',
  ].join('\n'));

  await cleanRcMarkers(home);

  const cleaned = fs.readFileSync(rc, 'utf8');
  assert.ok(!cleaned.includes('# theamify CLI PATH'), 'marker removed');
  assert.ok(!cleaned.includes('.local/bin'), 'PATH export removed');
  assert.ok(cleaned.includes('export FOO=bar'), 'unrelated line kept');
  assert.ok(cleaned.includes('export BAZ=qux'), 'unrelated line after marker kept');
  fs.rmSync(home, { recursive: true, force: true });
});

test('cleanRcMarkers tolerates missing rc files', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'self-home2-'));
  await cleanRcMarkers(home); // no .bashrc/.zshrc → must not throw
  fs.rmSync(home, { recursive: true, force: true });
});
