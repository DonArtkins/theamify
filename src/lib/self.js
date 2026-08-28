import { execa } from 'execa';
import pc from 'picocolors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export const NPM_NAME = pkg.name;
export const BIN_NAME = 'theamify';

/** Simple numeric semver compare: returns <0, 0, >0 when a is older/equal/newer. */
export function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Query npm for the latest published version of this package. */
export async function getLatestVersion() {
  try {
    const { stdout } = await execa('npm', ['view', NPM_NAME, 'version'], { reject: false });
    const v = (stdout || '').trim();
    return /^\d+\.\d+\.\d+/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Remove any leftover `# theamify CLI PATH` + follow-up `export PATH=` line from
 * ~/.bashrc and ~/.zshrc (added by old installs). Called by uninstall so no
 * traces of the tool remain in shell startup files.
 * @param {string} [homeDir] override the home directory (used by tests)
 */
export async function cleanRcMarkers(homeDir = os.homedir()) {
  const rcs = ['.bashrc', '.zshrc'].map((f) => path.join(homeDir, f));
  const marker = '# theamify CLI PATH';
  for (const rc of rcs) {
    try {
      if (!fs.existsSync(rc)) continue;
      const lines = fs.readFileSync(rc, 'utf8').split('\n');
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(marker)) {
          // Also drop the immediately-following `export PATH=` line.
          if (lines[i + 1] && /^\s*export PATH=/.test(lines[i + 1])) i++;
          continue;
        }
        out.push(lines[i]);
      }
      fs.writeFileSync(rc, out.join('\n'));
    } catch { /* rc not writable — skip */ }
  }
}

/**
 * Check whether the running local version is behind the latest published one.
 * @returns {Promise<{outdated:boolean, latest:string|null, current:string}>}
 */
export async function checkForUpdate() {
  const latest = await getLatestVersion();
  if (!latest) return { outdated: false, latest: null, current: pkg.version };
  return { outdated: compareVersions(latest, pkg.version) > 0, latest, current: pkg.version };
}

/**
 * If a newer version is available, offer to self-update via `npm install -g`.
 * @returns {Promise<boolean>} true when an update was performed
 */
export async function promptSelfUpdate() {
  const { outdated, latest, current } = await checkForUpdate();
  if (!outdated || !latest) return false;

  const p = await import('@clack/prompts');
  const want = await p.confirm({
    message: `A new version (${pc.cyan('v' + latest)}) is available — you have ${pc.dim('v' + current)}. Update now?`,
    initialValue: true,
  });
  if (p.isCancel(want) || !want) {
    p.log.message(pc.dim(`Keeping v${current} — update later with: npm install -g ${NPM_NAME}@latest`));
    return false;
  }

  // Release the terminal so npm's output is visible & interruptible.
  console.log();
  const res = await execa('npm', ['install', '-g', `${NPM_NAME}@latest`], { stdio: 'inherit', reject: false });
  if (res.exitCode !== 0) {
    p.log.warn('Update failed. You can retry with: npm install -g ' + NPM_NAME + '@latest');
    return false;
  }
  p.log.success(`Updated to v${latest}. Restart ${BIN_NAME} to use the new version.`);
  return true;
}

/**
 * Fully remove the npm package so the `theamify` command disappears from PATH.
 * Uninstall is non-interactive about this — removing the npm package is a core
 * part of "remove everything", not an optional extra.
 * @returns {Promise<boolean>} true when uninstalled
 */
export async function selfUninstall() {
  const p = await import('@clack/prompts');
  console.log();
  const res = await execa('npm', ['uninstall', '-g', NPM_NAME], { stdio: 'inherit', reject: false });
  if (res.exitCode === 0) {
    p.log.success(`${NPM_NAME} removed. The ${BIN_NAME} command is no longer available.`);
    return true;
  }
  p.log.warn(`Could not uninstall ${NPM_NAME} automatically. Run: npm uninstall -g ${NPM_NAME}`);
  return false;
}
