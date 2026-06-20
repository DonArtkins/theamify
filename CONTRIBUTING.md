# Contributing to theamify

## Setup

```bash
git clone https://github.com/DonArtkins/theamify
cd theamify
chmod +x theamify install.sh uninstall.sh update.sh
```

Run directly from the project root - no install needed for development:

```bash
./theamify help
./theamify list
./theamify status
```

`theamify` resolves `lib/` and `config/` relative to its own path, so a dev
clone and a system install (`sudo ./install.sh`) never conflict. Cache
directories (`themes/`, `.repo_cache/`) are created locally when you run from
the clone and are gitignored.

## Code conventions

- `set -euo pipefail` in every script. No exceptions.
- Quote every variable expansion: `"${var}"`, not `$var`.
- Color/control codes are defined once, in `lib/colors.sh`, with ANSI-C
  quoting (`$'\033[...m'`), not plain double quotes. Plain double quotes
  store the literal text `\033`, not the escape byte - it only becomes a
  real escape sequence if something later reprocesses it (`echo -e`, or a
  `printf` *format string*), and silently fails to if it doesn't (`printf
  '%s' "$colored_arg"` for instance). Defining the byte once at the source
  removes the failure mode everywhere downstream.
- Terminal output is ASCII only. No box-drawing characters (`─ ═ │ ║`), no
  emoji, no Unicode icons. They depend on the terminal's font having full
  Unicode coverage, which is not guaranteed - `print_rule`, `print_status`,
  and friends in `lib/colors.sh` use `-`, `=`, `|`, and bracket tags
  (`[OK]`, `[ERR]`, `[CACHED]`) for exactly this reason. Keep new output
  consistent with that.
- Use the existing print helpers (`print_success`, `print_error`,
  `print_step`, `print_kv`, `print_status`, ...) instead of raw `echo -e`
  with inline color codes, so tag style and `NO_COLOR` handling stay
  consistent.
- No decorative ASCII art, no celebratory or marketing language in output
  ("Awesome!", "This powerful tool..."). State what happened, plainly.
- Comments explain *why*, not *what*. Don't narrate obvious code.

## Adding a theme to the registry

Preferred: run the wizard, which appends a correctly formatted line.

```bash
./theamify add https://github.com/someone/their-grub-theme
```

Manual edits go in `config/themes.conf`, one entry per line:

```
NAME|GITHUB_URL|SUBDIR|DESCRIPTION|SOURCE_URL|TAGS
```

- `SUBDIR` is `.` for a repo where the theme lives at the root, or a
  relative path for a repo with multiple theme variants (see the
  `Elegant-*` entries for an example).
- `TAGS` is comma-separated, no spaces.
- Verify the entry resolves before submitting a PR:
  ```bash
  ./theamify get <name>
  ./theamify info <name>
  ```
  `theamify get` should report a valid `theme.txt`. If it can't find one,
  the `SUBDIR` is wrong or the repo needs a `find`-based fallback - fix the
  entry, don't paper over the error.

## Before submitting a PR

```bash
bash -n theamify lib/*.sh install.sh uninstall.sh update.sh   # syntax check
shellcheck theamify lib/*.sh install.sh uninstall.sh update.sh  # if installed
```

Manually exercise any command path you touched - `theamify` has no automated
test suite, so a syntax-clean script that fails at runtime is the common
failure mode. At minimum, run `list`, `status`, and `info <name>` against the
default registry, and `--no-color` against the same to confirm output stays
readable with colors stripped.

## Pull requests

- One concern per PR. Theme registry additions and code changes are
  separate PRs.
- Describe what changed and why in the PR body, not just the title.
- If you touched `lib/colors.sh` or any print helper, paste a terminal
  screenshot or pasted output - formatting regressions are easy to miss in
  a diff.

## Issues

Include the output of `theamify status`, the exact command you ran, and
what you expected instead of what happened. For rendering issues, also note
your terminal emulator and `$LANG`/`$LC_ALL` - most "weird character"
reports trace back to terminal/font/locale combinations.
