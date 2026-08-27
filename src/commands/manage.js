import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import {
  findInstalledRuntime,
  USER_DIR,
  USER_BIN_LINK,
  resolveEngine,
} from '../core/engine.js';
import { parseThemes } from '../lib/conf.js';
import { uninstallChafa } from '../lib/chafa.js';

/** `theamify doctor` — installation, GRUB and dependency health. */
export async function runDoctor() {
  console.log(pc.bold('\n🩺 theamify Doctor\n'));

  const found = findInstalledRuntime();
  const engine = await resolveEngine();
  console.log(`  Engine   : ${pc.cyan(engine)}`);
  console.log(`  Runtime  : ${found ? pc.cyan(found.dir) : pc.dim('(provisioned on demand)')}`);

  // Registry / theme count
  try {
    const themes = parseThemes();
    const cached = themes.filter((t) => fs.existsSync(path.join(USER_DIR, 'themes', t.name)));
    console.log(`  Registry : ${themes.length} theme(s), ${cached.length} cached`);
  } catch (e) {
    console.log(`  Registry : ${pc.red(`unreadable (${e.message})`)}`);
  }

  // GRUB active theme + dir
  const grubDir = grubDetectDir();
  console.log(`  GRUB dir : ${pc.cyan(grubDir)}`);
  const active = activeThemeLabel();
  console.log(`  Active   : ${active ? pc.green('⭐ ' + active) : pc.dim('none')}`);

  // Dependencies
  const deps = ['git', 'chafa', 'wget', 'curl'].map((d) => [d, which(d)]);
  console.log('  Deps     : ' + deps.map(([d, ok]) => `${d}:${ok ? pc.green('✓') : pc.dim('—')}`).join(' '));
  const grub = ['update-grub', 'grub-mkconfig', 'grub2-mkconfig'].filter((c) => which(c));
  console.log(`  GRUB cmd : ${grub.length ? grub.join(', ') : pc.red('none found')}`);
  console.log();
}

function which(bin) {
  try { return execa.sync('which', [bin], { reject: false }).stdout.trim(); } catch { return ''; }
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

/** `theamify uninstall` — interactive, every destructive step confirmed. */
export async function runUninstallWizard() {
  p.intro(pc.bgRed(pc.black(' theamify Uninstaller ')));
  const found = findInstalledRuntime();
  if (!found) p.log.info('No installed theamify runtime found (nothing to remove).');

  let removed = false;
  if (found) {
    const confirm = await p.confirm({
      message: `Remove theamify files at ${found.dir}/?`,
      initialValue: true,
    });
    if (!p.isCancel(confirm) && confirm) {
      try {
        const dir = found.dir;
        const owner = fs.statSync(dir).uid;
        if (owner === 0 && process.getuid() !== 0) {
          await execa('sudo', ['rm', '-rf', dir], { stdio: 'inherit' });
        } else {
          fs.rmSync(dir, { recursive: true, force: true });
        }
        removed = true;
        // remove the PATH symlink arm (never touches ~/.bashrc blocks without asking? leave PATH block — it's harmless)
        if (USER_BIN_LINK.startsWith(USER_DIR)) {
          fs.rmSync(USER_BIN_LINK, { force: true });
        }
      } catch {
        p.log.warn(`Could not remove ${found.dir}.`);
      }
    }
  }

  const keepGrub = await p.confirm({
    message: 'Keep your currently-applied GRUB theme? (recommended)',
    initialValue: true,
  });
  if (p.isCancel(keepGrub)) { p.cancel('Aborted.'); process.exit(0); }

  // Optionally remove the thumbnail renderer the wizard installed.
  await uninstallChafa();

  p.outro(pc.green(
    `Uninstalled.${removed ? ' Runtime removed.' : ''}${keepGrub ? ' Active GRUB theme left in place.' : ' To revert GRUB, remove GRUB_THEME= from /etc/default/grub and rebuild.'}`,
  ));
}