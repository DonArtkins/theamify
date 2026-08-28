import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import {
  removeRuntimeDir,
  buildResetGrubScript,
  resetGrubTheme,
} from '../src/commands/manage.js';

function mkRuntime(root) {
  // Mimic the installed runtime tree: engine + lib + config + themes + cache.
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.mkdirSync(path.join(root, 'themes', 'CyberEXS'), { recursive: true });
  fs.mkdirSync(path.join(root, '.repo_cache'), { recursive: true });
  fs.writeFileSync(path.join(root, 'theamify'), 'duplicate engine\n');
  fs.writeFileSync(path.join(root, 'themes', 'CyberEXS', 'theme.txt'), 'name="CyberEXS"\n');
  fs.writeFileSync(path.join(root, 'config', 'themes.conf'), 'CyberEXS|url|.|desc\n');
}

test('removeRuntimeDir deletes the runtime, ALL themes and the cache', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-rm-'));
  mkRuntime(root);
  assert.ok(fs.existsSync(path.join(root, 'themes', 'CyberEXS', 'theme.txt')), 'theme exists');

  const ok = await removeRuntimeDir(root);
  assert.equal(ok, true, 'returns true on success');
  assert.equal(fs.existsSync(root), false, 'entire runtime tree removed (themes + cache too)');
});

test('removeRuntimeDir is a no-op when the dir is already gone', async () => {
  const root = path.join(os.tmpdir(), 'thea-missing-' + Date.now());
  assert.equal(await removeRuntimeDir(root), true);
});

test('buildResetGrubScript strips GRUB_THEME and rebuilds the boot menu', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-grub-'));
  const grubFile = path.join(tmp, 'grub');
  fs.writeFileSync(grubFile, 'GRUB_DEFAULT=0\nGRUB_THEME="/boot/grub/themes/CyberEXS/theme.txt"\nGRUB_TIMEOUT=5\n');

  const script = buildResetGrubScript(grubFile);
  assert.match(script, new RegExp(`GRUB=${grubFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 'script targets the grub file');
  assert.match(script, /GRUB_THEME=/, 'script deletes GRUB_THEME');
  assert.match(script, /update-grub/, 'script rebuilds via update-grub');
});

test('resetGrubTheme clears GRUB_THEME from a fake grub file (asRoot)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thea-grub-'));
  // Create fake command stubs so update-grub exists on PATH for the script.
  const bin = path.join(tmp, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'update-grub'), '#!/usr/bin/env bash\n# stub\n');
  fs.chmodSync(path.join(bin, 'update-grub'), 0o755);

  const grubFile = path.join(tmp, 'grub');
  fs.writeFileSync(grubFile, 'GRUB_DEFAULT=0\nGRUB_THEME="/boot/grub/themes/Matrices/theme.txt"\nGRUB_TIMEOUT=5\n');

  // run the reset as root-equivalent (asRoot) via bash -c, with stub on PATH
  const script = buildResetGrubScript(grubFile);
  const res = await execa('bash', ['-c', `export PATH="${bin}:$PATH"; ${script}`], { reject: false });
  assert.equal(res.exitCode, 0, 'reset script runs cleanly');

  const after = fs.readFileSync(grubFile, 'utf8');
  assert.ok(!/GRUB_THEME=/.test(after), 'GRUB_THEME removed from grub file');
  assert.match(after, /GRUB_DEFAULT=0/, 'other grub settings preserved');
  assert.match(after, /GRUB_TIMEOUT=5/, 'other grub settings preserved');
});
