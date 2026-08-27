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
 * Provision a user-owned install of the engine under ~/.local/share/theamify so
 * it is writable without root (downloads write into themes/ and .repo_cache/).
 * Preserves an existing config/themes.conf (user registry edits). Returns the
 * runtime dir.
 */
export async function installUserRuntime() {
  const { execaSync } = await import('execa');
  fs.mkdirSync(path.join(USER_DIR, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(USER_DIR, 'config'), { recursive: true });
  fs.mkdirSync(path.join(USER_DIR, 'themes'), { recursive: true });
  fs.mkdirSync(path.join(USER_DIR, '.repo_cache'), { recursive: true });

  fs.copyFileSync(path.join(VENDOR_DIR, BIN_NAME), path.join(USER_DIR, BIN_NAME));
  fs.chmodSync(path.join(USER_DIR, BIN_NAME), 0o755);
  for (const lib of ['colors', 'utils', 'grub', 'themes']) {
    fs.copyFileSync(path.join(VENDOR_DIR, 'lib', `${lib}.sh`), path.join(USER_DIR, 'lib', `${lib}.sh`));
  }
  const confSrc = path.join(VENDOR_DIR, 'config', 'themes.conf');
  const confDst = path.join(USER_DIR, 'config', 'themes.conf');
  if (!fs.existsSync(confDst)) {
    fs.copyFileSync(confSrc, confDst);
  }

  // The installed engine expects a wrapping bin symlink so `sudo theamify` works.
  fs.mkdirSync(path.dirname(USER_BIN_LINK), { recursive: true });
  fs.rmSync(USER_BIN_LINK, { force: true });
  fs.symlinkSync(path.join(USER_DIR, BIN_NAME), USER_BIN_LINK);

  // Ensure a PATH marker so the command is reachable from a fresh shell.
  await ensureOnPath(path.dirname(USER_BIN_LINK));
  return USER_DIR;
}

/** Add a PATH export marker to ~/.bashrc and ~/.zshrc (idempotent). */
export function ensureOnPath(binDir) {
  const marker = '# theamify CLI PATH';
  const rcs = ['.bashrc', '.zshrc'].map((f) => path.join(os.homedir(), f));
  for (const rc of rcs) {
    try {
      const content = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
      if (content.includes(marker)) continue;
      fs.appendFileSync(rc, `\n${marker}\nexport PATH="${binDir}:$PATH"\n`);
    } catch { /* skip */ }
  }
}

/**
 * Resolve the path to the engine to run for a subcommand.
 * Prefers an installed runtime; otherwise provisions the bundled one in the
 * user share dir (so downloads are writable) and returns that.
 * @returns {string} absolute path to the theamify engine
 */
export async function resolveEngine() {
  const found = findInstalledRuntime();
  if (found) return path.join(found.dir, BIN_NAME);
  const dir = await installUserRuntime();
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