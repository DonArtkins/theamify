import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_DIR } from '../core/engine.js';

export const VENDOR_CONF = fileURLToPath(new URL('../../vendor/config/themes.conf', import.meta.url));

/**
 * Parse the `themes.conf` registry (NAME|URL|SUBDIR|DESC|SOURCE|TAGS).
 * Skips blank lines and `#` comments.
 * @param {string} [file] path to themes.conf (defaults to vendored copy)
 * @returns {Array<{name:string,url:string,sub:string,desc:string,source:string,tags:string[]}>}
 */
export function parseThemes(file = VENDOR_CONF) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const out = [];
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('|');
    const [name, url, sub, desc, source, tags] = parts;
    if (!name || !url) continue;
    out.push({
      name: name.trim(),
      url: url.trim(),
      sub: (sub || '.').trim(),
      desc: (desc || '').trim(),
      source: (source || '').trim(),
      tags: (tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    });
  }
  return out;
}

/**
 * Find a theme by name (case-insensitive).
 * @param {string} name
 * @param {string} [file]
 * @returns {object|null}
 */
export function findTheme(name, file = VENDOR_CONF) {
  if (!name) return null;
  return parseThemes(file).find((t) => t.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Resolve the registry file actually in use by the installed runtime when one
 * exists (so user's `theamify add`/`del` edits are honored), else the vendored
 * default shipped in this package.
 * @returns {string} path to themes.conf (runtime or vendored)
 */
export function resolveConfPath() {
  const runtimeConf = path.join(USER_DIR, 'config', 'themes.conf');
  return fs.existsSync(runtimeConf) ? runtimeConf : VENDOR_CONF;
}