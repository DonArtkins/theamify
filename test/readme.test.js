import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

test('README documents the current version (every release must update docs)', () => {
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(
    readme.includes(`v${pkg.version}`),
    `README should mention the current version v${pkg.version} in its "What's New" section`,
  );
});

test('README documents the npm install command matching package name', () => {
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes(`npm install -g ${pkg.name}`), 'README should show the global install command');
});