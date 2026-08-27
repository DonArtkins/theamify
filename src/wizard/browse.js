import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { parseThemes, resolveConfPath } from '../lib/conf.js';
import { resolveEngine, USER_DIR } from '../core/engine.js';

const USER_THEMES = path.join(USER_DIR, 'themes');
const GRUB_CFG = '/etc/default/grub';

/** Extract the currently-active theme folder name from /etc/default/grub. */
function activeTheme() {
  try {
    const cfg = fs.readFileSync(GRUB_CFG, 'utf8');
    const m = cfg.match(/^GRUB_THEME="?([^"\n]+)"?/m);
    if (!m) return null;
    return (path.basename(path.dirname(m[1])) || m[1]).trim() || null;
  } catch {
    return null;
  }
}

function themeStatus(name) {
  const active = activeTheme();
  let status = 'remote';
  if (fs.existsSync(path.join(USER_THEMES, name))) status = 'cached';
  if (name === active) status = 'active';
  return status;
}

const statusColor = (status) => ({
  active: pc.green,
  cached: pc.cyan,
  remote: pc.dim,
}[status] || pc.dim);

/**
 * Render a terminal "thumbnail" preview of a cached theme via chafa (or any
 * terminal image renderer the user has). Silently nops when unsatisfiable.
 * @returns {Promise<boolean>} true if a preview was rendered
 */
export async function showThemePreview({ name, width = 40, height = 12 }) {
  const dir = path.join(USER_THEMES, name);
  if (!fs.existsSync(dir)) return false;

  const image = fs.readdirSync(dir, { recursive: true })
    .map((f) => path.join(dir, f))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !f.includes('/.git/'))
    .sort()[0];
  if (!image) return false;

  const { execa } = await import('execa');
  for (const tool of ['chafa', 'timg', 'viu', 'jp2a']) {
    const args = tool === 'chafa'
      ? ['--size', `${width}x${height}`, image]
      : [image];
    try {
      const { stdout } = await execa(tool, args, { reject: false });
      if (stdout && stdout.trim()) {
        p.log.message(`\n${stdout}\n`);
        return true;
      }
    } catch { /* try next */ }
  }
  p.log.message(pc.dim('Install `chafa` (: sudo apt install chafa) for terminal theme previews.'));
  return false;
}

/** Interactive GRUB-theme browser wizard (mirrors GitSwitch's look & feel). */
export async function runThemeBrowser() {
  const themes = parseThemes(resolveConfPath());
  const active = activeTheme();

  const selected = await p.select({
    message: pc.bold('Pick a GRUB theme'),
    options: themes.map((t) => {
      const status = themeStatus(t.name);
      const color = statusColor(status);
      return {
        value: t,
        label: `${t.name}  ${color(`[${status.toUpperCase()}]`)}${t.name === active ? '  ⭐' : ''}`,
        hint: t.tags.slice(0, 3).join(', '),
      };
    }),
  });
  if (p.isCancel(selected)) { p.cancel('Bye! 👋'); process.exit(0); }

  p.log.step(`${pc.bold(selected.name)} — ${selected.desc}`);
  p.log.message(pc.dim(selected.url));

  if (fs.existsSync(path.join(USER_THEMES, selected.name))) {
    await showThemePreview({ name: selected.name });
  }

  const action = await p.select({
    message: `What do you want to do with ${pc.cyan(selected.name)}?`,
    options: [
      { value: 'preview', label: 'Show terminal thumbnail preview', hint: 'requires chafa + cached theme' },
      { value: 'get', label: 'Download / update it', hint: 'git clone into local cache' },
      { value: 'use', label: 'Apply to GRUB', hint: 'needs sudo; rebuilds GRUB' },
      { value: 'open', label: 'Open source page in browser' },
      { value: 'back', label: 'Cancel' },
    ],
  });
  if (p.isCancel(action) || action === 'back') { p.outro('Bye! 👋'); process.exit(0); }

  const engine = await resolveEngine();
  const { execa } = await import('execa');

  if (action === 'preview') {
    await showThemePreview({ name: selected.name, width: 80, height: 20 });
    p.outro(pc.green('Preview above.'));
  } else if (action === 'get') {
    const s = p.spinner();
    s.start(`Downloading ${selected.name}…`);
    try {
      await execa('bash', [engine, 'get', selected.name], { stdio: 'inherit', reject: true });
      s.stop(pc.green(`Downloaded ${selected.name}.`));
    } catch (e) {
      s.stop(pc.red(`Download failed: ${e.message}`));
    }
  } else if (action === 'use') {
    await runUse(engine, selected.name);
  } else if (action === 'open') {
    await execa('bash', [engine, 'open', selected.name], { stdio: 'inherit', reject: false });
  }
}

/** Apply a theme to GRUB, re-invoking with sudo, spinner released for the prompt. */
export async function runUse(engine, name) {
  const cached = path.join(USER_THEMES, name);
  if (!fs.existsSync(cached)) {
    p.log.warn(`${name} isn't downloaded yet. Fetching first…`);
    const s = p.spinner();
    s.start(`Downloading ${name}…`);
    try {
      await execa('bash', [engine, 'get', name], { stdio: 'inherit', reject: true });
      s.stop();
    } catch (e) {
      s.stop(pc.red(`Download failed: ${e.message}`));
      return;
    }
  }

  const confirmApply = await p.confirm({ message: `Apply ${pc.cyan(name)} to GRUB and rebuild? (sudo)`, initialValue: true });
  if (p.isCancel(confirmApply) || !confirmApply) { p.outro('Skipped.'); return; }

  const { execa } = await import('execa');
  if (process.getuid() !== 0) {
    // Release spinner, then prompt sudo on a clean terminal so Ctrl+C works.
    console.log();
    const res = await execa('sudo', ['bash', engine, 'use', name], { stdio: 'inherit', reject: false });
    return res.exitCode === 0
      ? p.outro(pc.green(`${name} is now your GRUB theme! 🎉`))
      : p.cancel('GRUB apply failed.');
  }
  const res = await execa('bash', [engine, 'use', name], { stdio: 'inherit', reject: false });
  res.exitCode === 0
    ? p.outro(pc.green(`${name} is now your GRUB theme! 🎉`))
    : p.cancel('GRUB apply failed.');
}