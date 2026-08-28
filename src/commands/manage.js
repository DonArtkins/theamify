import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa, execaSync } from 'execa';
import {
  findInstalledRuntime,
  USER_DIR,
  removeShadowBin,
  resolveEngine,
} from '../core/engine.js';
import { parseThemes, resolveConfPath } from '../lib/conf.js';
import { companionToolStatus } from '../lib/tools.js';

/** `theamify doctor` — installation, GRUB and dependency health. */
export async function runDoctor() {
  console.log(pc.bold('\n🩺 theamify Doctor\n'));

  const found = findInstalledRuntime();
  const engine = await resolveEngine();
  console.log(`  Engine   : ${pc.cyan(engine)}`);
  console.log(`  Runtime  : ${found ? pc.cyan(found.dir) : pc.dim('(provisioned on demand)')}`);

  // Registry / theme count
  try {
    const themes = parseThemes(resolveConfPath());
    const cached = themes.filter((t) => fs.existsSync(path.join(USER_DIR, 'themes', t.name)));
    console.log(`  Registry : ${themes.length} theme(s), ${cached.length} cached`);
  } catch (e) {
    console.log(`  Registry : ${pc.red(`unreadable (${e.message})`)}`);
  }

  // Base dependencies
  const deps = ['git', 'wget', 'curl'].map((d) => [d, which(d)]);
  console.log('  Deps     : ' + deps.map(([d, ok]) => `${d}:${ok ? pc.green('✓') : pc.dim('—')}`).join(' '));

  // Companion tools (chafa, grub-customizer)
  const tools = companionToolStatus();
  console.log('  Tools    : ' + tools.map((t) => `${t.name}:${t.present ? pc.green('✓') : pc.dim('—')}`).join(' '));

  // GRUB active theme + dir
  const grubDir = grubDetectDir();
  console.log(`  GRUB dir : ${pc.cyan(grubDir)}`);
  const active = activeThemeLabel();
  console.log(`  Active   : ${active ? pc.green('⭐ ' + active) : pc.dim('none')}`);

  const grub = ['update-grub', 'grub-mkconfig', 'grub2-mkconfig'].filter((c) => which(c));
  console.log(`  GRUB cmd : ${grub.length ? grub.join(', ') : pc.red('none found')}`);
  console.log();
}

function which(bin) {
  try { return execaSync('which', [bin], { reject: false }).stdout.trim(); } catch { return ''; }
}

function grubDetectDir() {
  for (const d of ['/boot/grub/themes', '/boot/grub2/themes', '/usr/share/grub/themes']) {
    if (fs.existsSync(d)) return d;
  }
  return '/boot/grub/themes';
}

/** Name of the currently-active GRUB theme, from /etc/default/grub. */
function activeThemeLabel() {
  try {
    const cfg = fs.readFileSync('/etc/default/grub', 'utf8');
    const m = cfg.match(/^GRUB_THEME="?([^"\n]+)"?/m);
    if (!m) return '';
    const dir = path.dirname(m[1]);
    return (dir === '.' ? '' : path.basename(dir)) || m[1];
  } catch {
    return '';
  }
}

/** `theamify status` — compact runtime status (wraps engine). */
export async function runStatus() {
  const engine = await resolveEngine();
  const res = await execa('bash', [engine, 'status'], { stdio: 'inherit', reject: false });
  if (res.exitCode !== 0) process.exit(res.exitCode);
}

/**
 * Remove a theamify runtime directory and everything in it (the engine PLUS all
 * downloaded themes under themes/ and .repo_cache/). Uses sudo when the dir is
 * root-owned.
 * @param {string} dir absolute path to the runtime dir
 * @returns {Promise<boolean>} true when the dir no longer exists
 */
export async function removeRuntimeDir(dir) {
  if (!fs.existsSync(dir)) return true;
  try {
    const owner = fs.statSync(dir).uid;
    if (owner === 0 && process.getuid() !== 0) {
      const res = await execa('sudo', ['rm', '-rf', dir], { stdio: 'inherit', reject: false });
      return res.exitCode === 0 && !fs.existsSync(dir);
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return !fs.existsSync(dir);
  } catch {
    return false;
  }
}

/** Build the bash script that clears GRUB_THEME and rebuilds the boot menu. */
export function buildResetGrubScript(grubFile = '/etc/default/grub') {
  return `
GRUB=${grubFile}
[ -f "$GRUB" ] || exit 0
sed -i '/^GRUB_THEME=/d' "$GRUB"
if command -v update-grub >/dev/null 2>&1; then
  update-grub
elif command -v grub-mkconfig >/dev/null 2>&1; then
  grub-mkconfig -o /boot/grub/grub.cfg
elif command -v grub2-mkconfig >/dev/null 2>&1; then
  grub2-mkconfig -o /boot/grub2/grub.cfg
fi
`.trim();
}

/**
 * Remove GRUB_THEME from /etc/default/grub and rebuild the boot menu so the
 * system returns to the default theme. Requires sudo when not root.
 * @param {{grubFile?:string, asRoot?:boolean}} [opts] injectable for tests
 * @returns {Promise<boolean>} true when GRUB was reset
 */
export async function resetGrubTheme({ grubFile = '/etc/default/grub', asRoot = process.getuid() === 0 } = {}) {
  const script = buildResetGrubScript(grubFile);
  if (asRoot) {
    const res = await execa('bash', ['-c', script], { stdio: 'inherit', reject: false });
    return res.exitCode === 0;
  }
  // Release the terminal so the sudo password prompt is visible & interruptible.
  console.log();
  const res = await execa('sudo', ['bash', '-c', script], { stdio: 'inherit', reject: false });
  return res.exitCode === 0;
}

/** `theamify uninstall` — removes theamify, ALL downloaded themes, and resets GRUB to default. */
export async function runUninstallWizard() {
  p.intro(pc.bgRed(pc.black(' theamify Uninstaller ')));
  const found = findInstalledRuntime();
  if (!found) p.log.info('No installed theamify runtime found (nothing to remove).');

  let removed = false;
  if (found) {
    const confirm = await p.confirm({
      message: `Remove theamify files at ${found.dir}/? (this deletes ALL downloaded themes)`,
      initialValue: true,
    });
    if (!p.isCancel(confirm) && confirm) {
      removed = await removeRuntimeDir(found.dir);
      if (removed) removeShadowBin();
      else p.log.warn(`Could not remove ${found.dir}.`);
    }
  }

  // Reset the boot menu back to the default (remove the applied GRUB theme).
  const resetGrub = await p.confirm({
    message: 'Remove your applied GRUB theme and reset to the default boot menu?',
    initialValue: true,
  });
  if (p.isCancel(resetGrub)) { p.cancel('Aborted.'); process.exit(0); }
  const grubReset = resetGrub ? await resetGrubTheme() : false;

  // Companion tools (chafa, grub-customizer) are intentionally LEFT in place —
  // the user may want them for later; uninstall only removes theamify itself.
  const themeNote = grubReset
    ? 'Boot menu reset to the default theme.'
    : (resetGrub ? 'GRUB reset could not be completed — remove GRUB_THEME= from /etc/default/grub and rebuild.' : 'Your applied GRUB theme was left in place.');

  p.outro(pc.green(
    `Uninstalled.${removed ? ' Runtime + all downloaded themes removed.' : ''} ${themeNote} Companion tools (chafa, grub-customizer) were kept for your use.`,
  ));
}