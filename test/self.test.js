import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, NPM_NAME, BIN_NAME } from '../src/lib/self.js';

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
