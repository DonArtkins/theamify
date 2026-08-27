import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, hasTool, hasToolSync, detectPackageManager, companionToolStatus } from '../src/lib/tools.js';

test('TOOLS registry includes chafa and grub-customizer', () => {
  const names = TOOLS.map((t) => t.name);
  assert.ok(names.includes('chafa'), 'chafa in registry');
  assert.ok(names.includes('grub-customizer'), 'grub-customizer in registry');
});

test('each tool has a bin and an install map', () => {
  for (const tool of TOOLS) {
    assert.ok(tool.bin, `${tool.name} has bin`);
    assert.ok(tool.install, `${tool.name} has install map`);
    assert.ok(tool.install['apt-get'], `${tool.name} has apt package`);
  }
});

test('hasTool returns a boolean (never throws)', async () => {
  for (const tool of TOOLS) {
    const r = await hasTool(tool);
    assert.strictEqual(typeof r, 'boolean');
  }
});

test('hasToolSync is consistent with hasTool', async () => {
  for (const tool of TOOLS) {
    assert.strictEqual(hasToolSync(tool), await hasTool(tool));
  }
});

test('detectPackageManager returns a known manager or null', () => {
  const pm = detectPackageManager();
  const known = ['apt-get', 'dnf', 'yum', 'pacman', 'zypper', 'apk'];
  if (pm !== null) assert.ok(known.includes(pm), `unexpected pm: ${pm}`);
});

test('companionToolStatus reports present/absent per tool', () => {
  const status = companionToolStatus();
  assert.equal(status.length, TOOLS.length);
  for (const s of status) {
    assert.ok('name' in s && 'present' in s);
  }
});