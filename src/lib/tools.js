import { execa, execaSync } from 'execa';
import pc from 'picocolors';
import * as p from '@clack/prompts';

/**
 * theamify companion tools — installed / updated by the wizard, but NEVER
 * removed on uninstall (they're useful to the user on their own).
 *
 * Registry:
 *   - chafa            terminal image renderer → inline theme thumbnails
 *   - grub-customizer  GUI to tweak the GRUB menu & themes
 */

export const TOOLS = [
  {
    name: 'chafa',
    bin: 'chafa',
    purpose: 'terminal thumbnail previews',
    install: { 'apt-get': 'chafa', 'dnf': 'chafa', 'yum': 'chafa', 'pacman': 'chafa', 'zypper': 'chafa', 'apk': 'chafa' },
  },
  {
    name: 'grub-customizer',
    bin: 'grub-customizer',
    purpose: 'GUI for tweaking the GRUB menu & themes',
    install: { 'apt-get': 'grub-customizer', 'dnf': 'grub-customizer', 'yum': 'grub-customizer', 'pacman': 'grub-customizer', 'zypper': 'grub-customizer', 'apk': null },
  },
];

/** @param {{bin:string}} tool */
export async function hasTool(tool) {
  try {
    const res = await execa('bash', ['-c', `command -v ${tool.bin}`], { reject: false });
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

/** @returns {string|null} package-manager-specific package name for a tool */
function packageNameFor(tool, pm) {
  return tool.install ? tool.install[pm] : (tool.name || null);
}

/** @returns {boolean} whether the tool binary is on PATH (sync) */
export function hasToolSync(tool) {
  try {
    return Boolean(execaSync('bash', ['-c', `command -v ${tool.bin}`], { reject: false }).stdout.trim());
  } catch {
    return false;
  }
}

/**
 * Install a tool via sudo, prompting the user first. Returns true when the tool
 * is usable afterwards.
 * @param {{name:string,bin:string,purpose:string,install?:Object}} tool
 * @param {{silent?:boolean}} [opts]
 */
export async function ensureTool(tool, { silent = false } = {}) {
  if (await hasTool(tool)) return true;

  const pm = detectPackageManager();
  const pkg = packageNameFor(tool, pm);
  if (!pm || !pkg) {
    if (!silent) p.log.warn(`No supported package manager (or no package) found for ${tool.name} — install "${tool.bin}" manually.`);
    return false;
  }

  if (!silent) {
    const want = await p.confirm({
      message: `Install ${pc.cyan(tool.name)} (${pkg}) for ${tool.purpose}?`,
      initialValue: true,
    });
    if (p.isCancel(want) || !want) {
      p.log.message(pc.dim(`Skipped ${tool.name} — install later with your package manager.`));
      return false;
    }
  }

  const s = p.spinner();
  s.start(`Installing ${tool.name}…`);
  try {
    // Release the spinner so the sudo prompt is visible & interruptible.
    s.stop('');
    const args = pm === 'pacman' ? ['-S', '--noconfirm', pkg] : [pm, 'install', '-y', pkg];
    await runPrivileged(args);
    if (!(await hasTool(tool))) throw new Error(`Install appeared to complete, but "${tool.bin}" is not on PATH.`);
    if (!silent) p.log.success(`${tool.name} installed.`);
    return true;
  } catch (e) {
    if (!silent) p.log.warn(`${tool.name} install failed: ${e.message}`);
    return false;
  }
}

/**
 * If a tool is present, offer to update it (default: just continue). If missing,
 * install it. This is the wizard's "auto-detect → install or update → continue".
 */
export async function ensureManagedTool(tool) {
  if (await hasTool(tool)) {
    const decision = await p.confirm({
      message: `${pc.cyan(tool.name)} is already installed. Update it now? (or just continue)`,
      initialValue: false,
    });
    if (p.isCancel(decision)) return true;
    if (decision) return updateTool(tool, { prompt: false });
    p.log.message(pc.dim(`${tool.name} kept as-is — continuing.`));
    return true;
  }
  return ensureTool(tool, { silent: false });
}

/** Run the wizard through every companion tool in registry order. */
export async function ensureManagedTools() {
  p.note('Companion tools are detected, installed or updated first.', 'Setup');
  for (const tool of TOOLS) {
    await ensureManagedTool(tool);
  }
}

/** Upgrade all managed companion tools (used by `theamify update`). */
export async function updateManagedTools() {
  for (const tool of TOOLS) {
    if (await hasTool(tool)) await updateTool(tool, { prompt: false });
    else await ensureTool(tool, { silent: true });
  }
}

/** Update a single tool to its latest available version (best-effort). */
export async function updateTool(tool, { prompt = false } = {}) {
  if (!(await hasTool(tool))) return ensureTool(tool, { silent: true });

  const pm = detectPackageManager();
  const pkg = packageNameFor(tool, pm);
  if (!pm || !pkg) return false;

  if (prompt) {
    const want = await p.confirm({ message: `Update ${pc.cyan(tool.name)} now?`, initialValue: true });
    if (p.isCancel(want) || !want) { p.log.message(pc.dim(`${tool.name} update skipped.`)); return true; }
  }

  p.log.step(`Updating ${tool.name}…`);
  try {
    const args = pm === 'pacman'
      ? ['-Syu', '--noconfirm', pkg]
      : pm === 'apk'
        ? ['apk', 'upgrade', pkg]
        : [pm, 'install', '-y', '--only-upgrade', pkg];
    await runPrivileged(args);
    p.log.success(`${tool.name} updated.`);
    return true;
  } catch (e) {
    p.log.warn(`${tool.name} update failed: ${e.message}`);
    return false;
  }
}

/** Report companion-tool presence (sync) for `doctor`. */
export function companionToolStatus() {
  return TOOLS.map((tool) => ({ name: tool.name, present: hasToolSync(tool) }));
}