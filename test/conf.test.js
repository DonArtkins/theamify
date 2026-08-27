import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemes, findTheme } from '../src/lib/conf.js';

const CONF = fileURLToPath(new URL('../vendor/config/themes.conf', import.meta.url));

test('parseThemes reads the registry into structured objects', () => {
  const themes = parseThemes(CONF);
  assert.ok(themes.length >= 8, `expected >=8 themes, got ${themes.length}`);
  const cyber = themes.find((t) => t.name === 'CyberEXS');
  assert.ok(cyber);
  assert.equal(cyber.url, 'https://github.com/HenriqueLopes42/themeGrub.CyberEXS');
  assert.equal(cyber.sub, '.');
  assert.ok(Array.isArray(cyber.tags) && cyber.tags.includes('cyberpunk'));
  assert.match(cyber.desc, /cyberpunk/i);
});

test('registry entries with generate: subdir are captured', () => {
  const themes = parseThemes(CONF);
  const matrices = themes.find((t) => t.name === 'Matrices');
  assert.ok(matrices, 'Matrices present');
  assert.match(matrices.sub, /^generate:/);
});

test('findTheme is case-insensitive and returns null for unknown', () => {
  assert.equal(findTheme('cyberexs', CONF)?.name, 'CyberEXS');
  assert.equal(findTheme('NOPE', CONF), null);
  assert.equal(findTheme('', CONF), null);
});

test('comments and blank lines are skipped', () => {
  const themes = parseThemes(CONF);
  assert.ok(themes.every((t) => !t.name.startsWith('#')));
  assert.ok(!themes.some((t) => t.name.trim() === ''));
});