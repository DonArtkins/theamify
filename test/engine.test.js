import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removeUserBin } from '../src/core/engine.js';

test('removeUserBin removes a symlink shadow bin', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-shadow-'));
  const target = path.join(home, 'real-engine');
  fs.writeFileSync(target, 'engine\n');
  const link = path.join(home, 'theamify');
  fs.symlinkSync(target, link);

  assert.equal(removeUserBin(link), true, 'returns true when removed');
  assert.equal(fs.existsSync(link), false, 'symlink gone');
  assert.equal(fs.existsSync(target), true, 'underlying file untouched');
  fs.rmSync(home, { recursive: true, force: true });
});

test('removeUserBin removes a real-file shadow bin (old engine copy)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-shadow2-'));
  const file = path.join(home, 'theamify');
  fs.writeFileSync(file, '#!/usr/bin/env bash\nengine\n');

  assert.equal(removeUserBin(file), true, 'returns true when removed');
  assert.equal(fs.existsSync(file), false, 'file gone');
  fs.rmSync(home, { recursive: true, force: true });
});

test('removeUserBin tolerates a missing path', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-shadow3-'));
  assert.equal(removeUserBin(path.join(home, 'nope')), false, 'false when nothing removed');
  fs.rmSync(home, { recursive: true, force: true });
});