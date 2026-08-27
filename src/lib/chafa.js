import { execa, execaSync } from 'execa';
import pc from 'picocolors';
import * as p from '@clack/prompts';

/**
 * chafa — the terminal image renderer behind theamify's thumbnail previews.
 * This module manages chafa as a first-class wizard dependency:
 *   - install   when the wizard runs and chafa is missing
 *   - update    when the wizard updates itself
 *   - uninstall when the wizard is uninstalled (opt-in)
 */

export const CHAFA_BIN = 'chafa';

/** @returns {Promise<boolean>} true if `chafa` is on PATH. */
export async function hasChafa() {
  try {
    const res = await execa('bash', ['-c', `command -v ${CHAFA_BIN}`], { reject: false });
    return Boolean(res.stdout.trim());
  } catch {
    return false;
  }
}

/** Detect which package manager is available. @returns {string|null} */
export function detectPackageManager() {
  const order = ['apt-get', 'dnf', 'yum', 'pacman', 'zypper', 'apk'];
  const pm = order.find((name) => {
    try {
      return Boolean(execaSync('bash', ['-c', `command -v ${name}`], { reject: false }).stdout.trim());
    } catch {
      return false;
    }
  });
  return pm || null;
}

/**
 * Run a privileged package-manager command, releasing the terminal first so the
 * sudo password prompt is visible and Ctrl+C actually works. Mirrors the
 * interactive-sudo pattern used by gitswitch and warp-wizard.
 * @param {string[]} cmd sudo + args
 */
async function runPrivileged(cmd) {
  const res = await execa('sudo', cmd, { stdio: 'inherit', reject: false });
  if (res.exitCode !== 0) throw new Error(`Command failed: sudo ${cmd.join(' ')} (exit ${res.exitCode})`);
  return res;
}

/**
 * Install chafa, prompting the user first. Safe no-op when a package manager is
 * unavailable or chafa is already installed.
 * @param {{silent?: boolean}} [opts]
 * @returns {Promise<boolean>} true when chafa is available afterwards
 */
export async function ensureChafa({ silent = false } = {}) {
  if (await hasChafa()) return true;

  const pm = detectPackageManager();
  if (!pm) {
    if (!silent) p.log.warn('No supported package manager found — install chafa manually to enable previews.');
    return false;
  }

  const want = silent ? true : await p.confirm({
    message: `Install ${pc.cyan('chafa')} to enable terminal theme previews?`,
    initialValue: true,
  });
  if (p.isCancel(want) || !want) {
    if (!silent) p.log.message(pc.dim('Skipped — theme thumbnails will be disabled. Install later with your package manager.'));
    return false;
  }

  if (!silent) p.log.step(`Installing chafa via ${pm}…`);
  const s = p.spinner();
  s.start('Installing chafa…');
  try {
    // Release the spinner so the sudo prompt is visible & interruptible.
    s.stop('');
    const pkgArgs = pm === 'pacman' ? ['-S', '--noconfirm', 'chafa'] : [pm, 'install', '-y', 'chafa'];
    await runPrivileged(pkgArgs);
    if (!(await hasChafa())) throw new Error('chafa install appeared to complete, but chafa is not on PATH.');
    if (!silent) p.log.success('chafa installed — terminal thumbnails enabled!');
    return true;
  } catch (e) {
    if (!silent) p.log.warn(`chafa install failed: ${e.message}\n  Try manually: sudo apt install chafa`);
    return false;
  }
}

/** Update chafa to its latest available version (best-effort). */
export async function updateChafa() {
  if (!(await hasChafa())) return ensureChafa({ silent: true });

  const pm = detectPackageManager();
  if (!pm) return false;
  p.log.step('Updating chafa…');
  try {
    const args = pm === 'pacman'
      ? ['-Syu', '--noconfirm', 'chafa']
      : pm === 'apk'
        ? ['apk', 'upgrade', 'chafa']
        : [pm, 'install', '-y', '--only-upgrade', 'chafa'];
    await runPrivileged(args);
    p.log.success('chafa updated.');
    return true;
  } catch (e) {
    p.log.warn(`chafa update failed: ${e.message}`);
    return false;
  }
}

/**
 * Remove chafa after confirming. Only called from the uninstall wizard.
 * @returns {Promise<boolean>} true when chafa was removed
 */
export async function uninstallChafa() {
  if (!(await hasChafa())) { p.log.message(pc.dim('chafa not installed — nothing to remove.')); return false; }

  const pm = detectPackageManager();
  if (!pm) { p.log.warn('No package manager found — remove chafa yourself.'); return false; }

  const want = await p.confirm({
    message: 'Also remove chafa (thumbnail renderer)? You can re-enable previews later by reinstalling it.',
    initialValue: false,
  });
  if (p.isCancel(want) || !want) { p.log.message(pc.dim('Kept chafa.')); return false; }

  p.log.step(`Removing chafa via ${pm}…`);
  try {
    const args = pm === 'pacman'
      ? ['pacman', '-Rns', '--noconfirm', 'chafa']
      : pm === 'apk'
        ? ['apk', 'del', 'chafa']
        : [pm, 'remove', '-y', 'chafa'];
    await runPrivileged(args);
    p.log.success('chafa removed.');
    return true;
  } catch (e) {
    p.log.warn(`chafa removal failed: ${e.message}`);
    return false;
  }
}