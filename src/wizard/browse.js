import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import { parseThemes, resolveConfPath } from '../lib/conf.js';
import { ensureManagedTools } from '../lib/tools.js';
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

/** True when a theme has been downloaded into the local user cache. */
function isCached(name) {
  return fs.existsSync(path.join(USER_THEMES, name));
}

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
  p.log.message(pc.dim('Install `chafa` (sudo apt install chafa) for terminal theme previews.'));
  return false;
}

/**
 * Make sure a theme is present in the local cache, downloading on demand.
 * @returns {Promise<boolean>} true when the theme is cached (ready to preview/apply)
 */
async function ensureCached(engine, name) {
  if (isCached(name)) return true;
  p.log.warn(`${name} isn't downloaded yet. Fetching first…`);
  const s = p.spinner();
  s.start(`Downloading ${name}…`);
  try {
    await execa('bash', [engine, 'get', name], { stdio: 'inherit', reject: true });
    s.stop(pc.green(`Downloaded ${name}.`));
    return true;
  } catch (e) {
    s.stop(pc.red(`Download failed: ${e.message}`));
    return false;
  }
}

/**
 * Download every registry theme into the local cache during setup. Runs the
 * engine's `get --all`, which skips anything already cached and never prompts
 * per-theme. Returns the number cached afterwards.
 */
async function ensureAllThemes(engine, { prompt = true } = {}) {
  if (prompt) {
    const want = await p.confirm({
      message: 'Download all themes now (so every theme has an instant preview)?',
      initialValue: true,
    });
    if (p.isCancel(want) || !want) {
      p.log.message(pc.dim('Skipped — you can download individual themes from the menu.'));
      return;
    }
  }

  const s = p.spinner();
  s.start('Downloading all themes…');
  try {
    await execa('bash', [engine, 'get', '--all'], { stdio: 'inherit', reject: true });
    s.stop(pc.green('All themes downloaded.'));
  } catch (e) {
    s.stop(pc.red(`Theme download incomplete: ${e.message}`));
  }
}

/**
 * Interactive GRUB-theme browser wizard (mirrors GitSwitch's look & feel).
 * Stays in a menu loop: pick a theme → preview / download / apply / open →
 * back to the theme list — it NEVER hard-exits until you choose Quit.
 */
export async function runThemeBrowser() {
  // Step 1: ensure companion tools (chafa, grub-customizer) — detect, install
  // or update, then continue BEFORE showing the theme picker.
  await ensureManagedTools();

  const engine = await resolveEngine();

  // Step 2: install-flow — make all themes downloadable/previewable up front so
  // the user never has to fetch one just to see it.
  await ensureAllThemes(engine, { prompt: true });

  let quit = false;

  while (!quit) {
    const themes = parseThemes(resolveConfPath());
    const active = activeTheme();

    const picked = await p.select({
      message: pc.bold('Pick a GRUB theme'),
      options: themes.map((t) => {
        const status = themeStatus(t.name);
        const color = statusColor(status);
        return {
          value: t,
          label: `${t.name}  ${color(`[${status.toUpperCase()}]`)}${t.name === active ? '  ⭐' : ''}`,
          hint: (isCached(t.name) ? '🖼 ' : '') + t.tags.slice(0, 3).join(', '),
        };
      }),
    });
    if (p.isCancel(picked)) { quit = true; break; }

    p.log.step(`${pc.bold(picked.name)} — ${picked.desc}`);
    p.log.message(pc.dim(picked.url));

    // Thumbnails render by default: show the preview whenever the theme is
    // cached, otherwise point the user at Download to unlock it.
    const cached = isCached(picked.name);
    if (cached) {
      await showThemePreview({ name: picked.name });
    } else {
      p.log.message(pc.dim('Not cached yet — choose “Download / update it” below to preview it.'));
    }

    // Per-theme action loop: runs until the user goes back to the list or quits.
    let backToMenu = false;
    while (!quit && !backToMenu) {
      const action = await p.select({
        message: `What do you want to do with ${pc.cyan(picked.name)}?`,
        options: [
          { value: 'get', label: 'Download / update it', hint: 'git clone into local cache' },
          { value: 'use', label: 'Apply to GRUB', hint: 'needs sudo; rebuilds GRUB' },
          { value: 'open', label: 'Open source page in browser' },
          { value: 'menu', label: '← Back to theme list' },
          { value: 'quit', label: 'Quit browser' },
        ],
      });

      if (p.isCancel(action) || action === 'quit') { quit = true; break; }
      if (action === 'menu') { backToMenu = true; break; }

      if (action === 'get') {
        await ensureCached(engine, picked.name);
      } else if (action === 'use') {
        await runUse(engine, picked.name);
      } else if (action === 'open') {
        await execa('bash', [engine, 'open', picked.name], { stdio: 'inherit', reject: false });
      }
    }
  }

  p.outro(pc.cyan('Bye! 👋'));
}

/**
 * Apply a theme to GRUB, re-invoking with sudo, spinner released for the prompt.
 * Returns true when the apply was attempted/succeeded (false if aborted).
 */
export async function runUse(engine, name) {
  if (!(await ensureCached(engine, name))) { p.cancel('Aborted — theme not downloaded.'); return false; }

  const confirmApply = await p.confirm({ message: `Apply ${pc.cyan(name)} to GRUB and rebuild? (sudo)`, initialValue: true });
  if (p.isCancel(confirmApply) || !confirmApply) {
    p.log.message(pc.dim('Skipped — theme not applied.'));
    return false;
  }

  if (process.getuid() !== 0) {
    // Release spinner, then prompt sudo on a clean terminal so Ctrl+C works.
    console.log();
    const res = await execa('sudo', ['bash', engine, 'use', name], { stdio: 'inherit', reject: false });
    if (res.exitCode === 0) { p.log.success(`${name} is now your GRUB theme! 🎉`); return true; }
    p.cancel('GRUB apply failed.');
    return false;
  }
  const res = await execa('bash', [engine, 'use', name], { stdio: 'inherit', reject: false });
  if (res.exitCode === 0) { p.log.success(`${name} is now your GRUB theme! 🎉`); return true; }
  p.cancel('GRUB apply failed.');
  return false;
}
