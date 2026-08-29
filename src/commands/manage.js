import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa, execaSync } from 'execa';
import {
  findInstalledRuntime,
  SYSTEM_DIR,
  USER_DIR,
  BIN_NAME,
  removeUserBin,
  repairRuntime,
  resolveEngine,
} from '../core/engine.js';
import { parseThemes, resolveConfPath } from '../lib/conf.js';
import { companionToolStatus } from '../lib/tools.js';
import { checkForUpdate, promptSelfUpdate, selfUninstall, cleanRcMarkers } from '../lib/self.js';

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

/** `theamify upgrade` — self-update the npm CLI if a newer version is published. */
/** `theamify upgrade` — check for & install the latest npm version. */
export async function runSelfUpgrade() {
  const { outdated, latest, current } = await checkForUpdate();
  if (!outdated) {
    console.log(pc.green(`Already on the latest version (v${current}).`));
    return;
  }
  console.log(`Available: ${pc.cyan('v' + latest)}  (you have ${pc.dim('v' + current)})`);
  await promptSelfUpdate();
}

/**
 * `theamify update` — bring EVERYTHING up to date, exactly like gitswitch's
 * `update`:
 *   1. Pull the latest npm CLI from the registry (prompts, defaults to yes).
 *   2. Then refresh companion tools (chafa, grub-customizer).
 *   3. Then re-download all cached themes.
 * @param {string[]} rest forwarded theme args (e.g. a single theme name)
 */
export async function runFullUpdate(rest = []) {
  const { outdated, latest, current } = await checkForUpdate();
  if (outdated) {
    console.log(pc.cyan(`A newer version (v${latest}) is published — you have v${current}.`));
    const updated = await promptSelfUpdate();
    if (updated) {
      console.log(pc.yellow('theamify CLI updated. Re-run `theamify update` (or just `theamify`) to continue updating tools & themes.'));
      return;
    }
    console.log(pc.dim('Continuing — keeping current CLI version.'));
  } else {
    console.log(pc.green(`theamify CLI is on the latest version (v${current}).`));
  }

  const { updateManagedTools } = await import('../lib/tools.js');
  await updateManagedTools();
  const { runEngine } = await import('../core/engine.js');
  await runEngine(['update', ...rest]);
}

/** `theamify repair` — fix a broken install by re-provisioning the engine/runtime. */
export async function runRepair() {
  console.log(pc.bold('\n🔧 theamify Repair\n'));
  const engine = await repairRuntime();
  console.log(`  Engine   : ${pc.cyan(engine)}`);
  console.log(`  Runtime  : ${pc.cyan(path.join(USER_DIR))}`);
  console.log('  Status   : ' + pc.green('engine re-provisioned'));
  console.log('  Downloads: ' + (fs.existsSync(path.join(USER_DIR, 'themes')) ? pc.green('themes preserved') : pc.dim('no cached themes yet')));
  console.log();
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

/** `theamify uninstall` — remove EVERY trace of theamify so the command vanishes. */
export async function runUninstallWizard() {
  p.intro(pc.bgRed(pc.black(' theamify Uninstaller ')));

  const found = findInstalledRuntime();
  if (found) p.note(found.dir, 'Installed runtime detected');

  const confirm = await p.confirm({
    message: 'Uninstall theamify completely? This removes the runtime, ALL downloaded themes, the applied GRUB theme, the theamify-cli npm package, ~/.local/bin/theamify and every PATH marker.',
    initialValue: true,
  });
  if (p.isCancel(confirm)) { p.cancel('Aborted.'); process.exit(0); }
  if (!confirm) { p.outro('Nothing was removed.'); return; }

  // 1. Remove EVERY runtime tree — user AND system. (removeRuntimeDir uses
  //    sudo automatically for root-owned dirs like /usr/local/share/theamify.)
  let removedCount = 0;
  for (const dir of [SYSTEM_DIR, USER_DIR]) {
    if (fs.existsSync(path.join(dir, BIN_NAME))) {
      if (await removeRuntimeDir(dir)) removedCount++;
      else p.log.warn(`Could not remove ${dir}.`);
    }
  }

  // 2. Remove any legacy `~/.local/bin/theamify` shadow — symlink OR real file.
  //    This is what KEEPS the command alive when `~/.local/bin` is on PATH.
  if (removeUserBin()) p.log.success('Removed ~/.local/bin/theamify.');

  // 3. Reset the boot menu back to the default (remove the applied GRUB theme).
  const grubReset = await resetGrubTheme();

  // 4. Remove the npm package so the `theamify` command truly disappears.
  const npmRemoved = await selfUninstall();

  // 5. Remove leftover PATH markers from ~/.bashrc / ~/.zshrc so zero traces remain.
  await cleanRcMarkers();

  // Companion tools (chafa, grub-customizer) are intentionally LEFT in place —
  // they are not theamify; uninstall only removes theamify itself.
  const themeNote = grubReset
    ? 'Boot menu reset to the default theme.'
    : 'GRUB reset could not be completed — remove GRUB_THEME= from /etc/default/grub and rebuild.';

  p.outro(pc.green(
    `Uninstalled.${removedCount ? ` ${removedCount} runtime tree(s) + all downloaded themes removed.` : ''} ${themeNote} ${npmRemoved ? 'theamify-cli npm package removed — the theamify command is gone.' : 'theamify-cli npm package could not be removed automatically — run: npm uninstall -g theamify-cli'} Companion tools (chafa, grub-customizer) were kept for your use.`,
  ));
  p.log.message(pc.dim('After uninstall, `theamify` reports: bash: theamify: command not found'));
  p.log.message(pc.dim('If this terminal still shows "No such file or directory", clear bash\'s cached command path with: hash -r (or open a new terminal).'));
}