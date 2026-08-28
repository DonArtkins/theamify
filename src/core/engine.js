import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the bundled bash engine + app tree shipped inside the npm
 * package. The whole engine (script + lib/ + config/) lives under vendor/.
 */
export const VENDOR_DIR = fileURLToPath(new URL('../../vendor', import.meta.url));
export const ENGINE_SCRIPT = path.join(VENDOR_DIR, 'theamify');

/** Install/run-time locations. */
export const SYSTEM_DIR = '/usr/local/share/theamify';
export const USER_DIR = path.join(os.homedir(), '.local', 'share', 'theamify');
export const BIN_NAME = 'theamify';
/** Legacy self-shadowing symlink that used to point at the bundled bash engine. */
export const USER_BIN_LINK = path.join(os.homedir(), '.local', 'bin', BIN_NAME);

/**
 * Locate an installed theamify runtime.
 * @returns {{dir: string}|null}
 */
export function findInstalledRuntime() {
  for (const dir of [SYSTEM_DIR, USER_DIR]) {
    if (fs.existsSync(path.join(dir, BIN_NAME))) return { dir };
  }
  return null;
}

/**
 * Remove the legacy `~/.local/bin/theamify` symlink if it exists. It was created
 * by old installs to point at the bundled bash engine, which SHADOWS the npm CLI
 * (because `~/.local/bin` precedes the npm global bin on PATH — so `theamify`,
 * `theamify uninstall`, `theamify doctor`, etc. silently ran the old engine).
 * The npm package already installs `theamify -> bin/theamify.js` in the npm
 * global bin, which is on PATH, so the symlink is unnecessary and harmful.
 * Only ever removes a symlink — never a real file the user owns.
 */
export function removeShadowBin() {
  try {
    const st = fs.lstatSync(USER_BIN_LINK);
    if (st.isSymbolicLink()) fs.rmSync(USER_BIN_LINK, { force: true });
  } catch { /* nothing to remove */ }
}

/**
 * Remove anything at `~/.local/bin/theamify` — a legacy shadow executable that
 * keeps the `theamify` command alive and SHADOWS the npm CLI after uninstall
 * (because `~/.local/bin` precedes the npm global bin on PATH). Removes BOTH a
 * symlink and a plain-file engine copy left behind by old installs.
 * @param {string} [binPath] override the path (used by tests)
 * @returns {boolean} true when something was removed
 */
export function removeUserBin(binPath = USER_BIN_LINK) {
  try {
    if (fs.existsSync(binPath) || fs.lstatSync(binPath)) {
      fs.rmSync(binPath, { force: true });
      return !fs.existsSync(binPath);
    }
  } catch { /* nothing to remove */ }
  return false;
}

/** Copy the vendored engine script + shared libs into a runtime dir. */
function copyEngineTo(dir) {
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.copyFileSync(path.join(VENDOR_DIR, BIN_NAME), path.join(dir, BIN_NAME));
  fs.chmodSync(path.join(dir, BIN_NAME), 0o755);
  for (const lib of ['colors', 'utils', 'grub', 'themes']) {
    fs.copyFileSync(path.join(VENDOR_DIR, 'lib', `${lib}.sh`), path.join(dir, 'lib', `${lib}.sh`));
  }
}

/**
 * Refreshes an existing installed runtime's engine script + libs to match the
 * bundled package (so the disk engine is never a stale older version). User
 * registry edits in config/themes.conf are preserved.
 */
function syncEngineTo(dir) {
  const installed = path.join(dir, BIN_NAME);
  const vendored = path.join(VENDOR_DIR, BIN_NAME);
  try {
    if (fs.existsSync(installed) && fs.readFileSync(installed, 'utf8') !== fs.readFileSync(vendored, 'utf8')) {
      copyEngineTo(dir);
    }
  } catch {
    copyEngineTo(dir);
  }
}

/**
 * Provision a user-owned install of the engine under ~/.local/share/theamify so
 * it is writable without root (downloads write into themes/ and .repo_cache/).
 * Preserves an existing config/themes.conf (user registry edits). Does NOT create
 * a PATH shadow symlink — the npm global bin is already on PATH. Returns the
 * runtime dir.
 */
export async function installUserRuntime() {
  fs.mkdirSync(path.join(USER_DIR, 'config'), { recursive: true });
  fs.mkdirSync(path.join(USER_DIR, 'themes'), { recursive: true });
  fs.mkdirSync(path.join(USER_DIR, '.repo_cache'), { recursive: true });

  copyEngineTo(USER_DIR);
  const confSrc = path.join(VENDOR_DIR, 'config', 'themes.conf');
  const confDst = path.join(USER_DIR, 'config', 'themes.conf');
  if (!fs.existsSync(confDst)) {
    fs.copyFileSync(confSrc, confDst);
  }

  removeShadowBin();
  return USER_DIR;
}

/**
 * Repair a broken install: re-provision the engine/runtime from the bundled
 * package (fixes a missing/corrupt engine or runtime tree) and remove any stale
 * shadow symlink. Downloads are preserved unless the whole runtime is missing.
 * @returns {Promise<string>} path to the repaired engine
 */
export async function repairRuntime() {
  const found = findInstalledRuntime();
  if (found) {
    syncEngineTo(found.dir);
    removeShadowBin();
    return path.join(found.dir, BIN_NAME);
  }
  const dir = await installUserRuntime();
  removeShadowBin();
  return path.join(dir, BIN_NAME);
}

/**
 * Resolve the path to the engine to run for a subcommand.
 * Prefers an installed runtime; otherwise provisions the bundled one in the
 * user share dir (so downloads are writable) and returns that.
 * @returns {string} absolute path to the theamify engine
 */
export async function resolveEngine() {
  const found = findInstalledRuntime();
  if (found) {
    syncEngineTo(found.dir);
    removeShadowBin();
    return path.join(found.dir, BIN_NAME);
  }
  const dir = await installUserRuntime();
  removeShadowBin();
  return path.join(dir, BIN_NAME);
}

/**
 * Run the engine (installed or bundled) with inherited stdio so the rich TUI
 * and all subcommands behave exactly like the native tool.
 * @param {string[]} args
 * @returns {Promise<{exitCode: number|null}>}
 */
export async function runEngine(args = []) {
  const { execa } = await import('execa');
  const engine = await resolveEngine();
  return execa('bash', [engine, ...args], { stdio: 'inherit', reject: false });
}
