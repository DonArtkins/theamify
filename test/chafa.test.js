import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasChafa, detectPackageManager } from '../src/lib/chafa.js';

test('hasChafa returns a boolean (never throws)', async () => {
  const r = await hasChafa();
  assert.strictEqual(typeof r, 'boolean');
});

test('detectPackageManager returns a known manager or null', () => {
  const pm = detectPackageManager();
  const known = ['apt-get', 'dnf', 'yum', 'pacman', 'zypper', 'apk'];
  if (pm !== null) {
    assert.ok(known.includes(pm), `unexpected pm: ${pm}`);
  }
});