import { defineCommand, runMain } from 'citty';
import pc from 'picocolors';
import { createRequire } from 'node:module';
import { runThemeBrowser } from './wizard/browse.js';
import { runDoctor, runStatus, runUninstallWizard } from './commands/manage.js';
import { runEngine } from './core/engine.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/** Commands forwarded straight to the bash engine. */
const ENGINE_COMMANDS = ['list', 'ls', 'info', 'show', 'get', 'fetch', 'download', 'remove', 'rm', 'uncache', 'add', 'del', 'delete', 'update', 'open', 'browse', 'clean', 'purge-cache', 'help', '-h', '-V', '--version'];

/**
 * Forward argv to the bash engine and mirror its exit status onto this process.
 * @param {string[]} args
 */
async function forwardEngine(args) {
  const res = await runEngine(args);
  if (res && Number.isInteger(res.exitCode) && res.exitCode !== 0) {
    process.exitCode = res.exitCode;
  }
  return res;
}

function printUsage() {
  console.log(`
${pc.bold('theamify')} ${pc.dim(`v${pkg.version}`)} — GRUB theme manager

${pc.bold('Usage:')}
  theamify                    ✨ Interactive theme browser wizard (pick → preview → apply)
  theamify list               List all themes with status
  theamify info <name>        Show details + terminal preview (needs chafa)
  theamify get <name>         Download & cache a theme
  theamify get --all          Download every theme
  theamify use <name>         Apply theme to GRUB ${pc.dim('[sudo]')}
  theamify update [<name>]    Re-download cached themes
  theamify remove <name>      Clear local cache (keeps registry entry)
  theamify add <github-url>   Add a theme to the registry
  theamify del <name>         Remove a theme from the registry
  theamify open <name>        Open the theme source page in a browser
  theamify status             Show GRUB & dependency status
  theamify doctor             Diagnose install, GRUB & dependencies
  theamify uninstall          Remove theamify (asks before deleting anything)
  theamify clean              Clear the repo clone cache
`);
}

/**
 * Terminal safety net: when an interactive child (sudo password prompt) is
 * running, the terminal is in canonical mode and Ctrl+C/Z arrive as real
 * signals. Restore the cursor and exit cleanly instead of hanging.
 */
function terminateAndRestore(code) {
  try {
    if (process.stdout.isTTY) process.stdout.write('\x1b[?25h\n\r');
  } catch { /* best effort */ }
  process.exit(code);
}
if (process.platform !== 'win32') process.on('SIGTSTP', () => terminateAndRestore(130)); // Ctrl+Z
process.on('SIGINT', () => terminateAndRestore(130));  // Ctrl+C
process.on('SIGTERM', () => terminateAndRestore(143)); // kill/terminate

const main = defineCommand({
  meta: {
    name: 'theamify',
    version: pkg.version,
    description: 'GRUB theme manager & interactive browser wizard',
  },
  async run({ args }) {
    const [cmd, ...rest] = args._;

    // No arguments → the interactive theme browser wizard.
    if (!cmd) return runThemeBrowser();

    switch (cmd) {
      case 'wizard':
      case 'browse':
        return runThemeBrowser();
      case 'status':
        return runStatus();
      case 'doctor':
        return runDoctor();
      case 'uninstall':
        return runUninstallWizard();
      case 'use':
      case 'apply':
      case 'set':
        return forwardEngine(['use', ...rest]);
      case 'info':
      case 'show':
        return forwardEngine(['info', ...rest]);
      default:
        if (ENGINE_COMMANDS.includes(cmd)) return forwardEngine(args._);
        console.error(pc.red(`Unknown command: ${cmd}`));
        printUsage();
        process.exitCode = 1;
        return undefined;
    }
  },
});

runMain(main);