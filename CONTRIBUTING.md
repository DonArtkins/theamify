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

## Developing against an existing install

theamify resolves its own location at startup (`_SCRIPT_DIR` in the
`theamify` script): if it finds `lib/colors.sh` next to itself, it's running
in **dev mode** straight out of this checkout; otherwise it falls back to
`/usr/local/share/theamify`, the system install. Two separate, independent
copies of the tool can exist on the same machine at once, and editing one
never touches the other.

This matters for picking which script to run after a change:

- **Iterating on a change** - just run `./theamify <command>` from this
  checkout. No install, no sudo, no rebuild step. This is the fast loop;
  reach for it for almost everything while developing.
- **Pushing a change to the system-wide `theamify` command** (the one on
  your `$PATH` via `/usr/local/bin/theamify`) - run `sudo ./install.sh`.
  This copies `theamify` and `lib/*.sh` into `/usr/local/share/theamify`.
  **Gotcha:** it does *not* overwrite an already-installed
  `config/themes.conf` by default, to protect a user's `add`/`del` edits
  from being clobbered by a reinstall. If you changed `config/themes.conf`
  in this checkout (added/removed/edited a registry entry) and want that
  to reach the installed copy too, pass `--sync-conf`:
  ```bash
  sudo ./install.sh --sync-conf
  ```
  Without it, the installed `themes.conf` silently stays whatever it was
  before - the most common cause of "I fixed the bug but `theamify` still
  does the old broken thing" during local development.
- **`update.sh`** is a *different* tool: it's the self-updater meant for an
  end user who installed theamify from a git clone and wants to pick up
  changes you've pushed to the remote (`git pull --rebase`, then
  `install.sh`). It assumes there's something new to pull from a remote
  tracking branch - it isn't a substitute for `install.sh` when you're
  iterating on local, uncommitted changes on the same machine.

In short: develop with `./theamify`, deploy locally with `sudo ./install.sh`
(`--sync-conf` if you touched the registry), and leave `update.sh` for
syncing a remote release onto a machine that already has theamify installed.

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
- **Any function whose return value is captured via `$(...)` must keep its
  stdout limited to exactly that value - every status/progress message
  inside it goes to stderr (`print_step "..." >&2`, etc.), and so does
  anything the spinner (`spinner_start`/`spinner_stop`) prints, since those
  already write to stderr unconditionally.** `get_repo()` and
  `theme_generate_subdir()` in `lib/themes.sh`/`lib/utils.sh` are the
  reference examples - both return a path via `echo` at the end and are
  always called as `x="$(get_repo ...)"`. Forgetting this is exactly the
  bug class that broke `theamify get --all` before 1.0.1: `print_step` and
  `print_success` defaulted to stdout, the spinner wrote raw `\r`-frames to
  stdout too, and all of it ended up concatenated into the "returned" repo
  path, which then got handed straight to `cp` as a single garbage
  argument. `git_clone()` has the same constraint for a different reason -
  it's called from inside `get_repo()`, so anything it lets through to fd1
  (rather than fd2) also leaks into that capture; it now redirects with
  `>&2` and sets `GIT_TERMINAL_PROMPT=0` so a missing/private repo fails
  fast instead of blocking the whole batch on a credential prompt no one's
  there to answer.
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

- `SUBDIR` is `.` for a repo where the theme lives at the root, a relative
  path for a repo that ships pre-built theme folders for each variant
  (`theamify` falls back to a case-insensitive `find` if the exact path
  doesn't exist), or `generate:<args>` for a repo that *generates*
  `theme.txt` at build time via its own `generate.sh` instead of committing
  a static folder.
- For `generate:<args>`: theamify always supplies `-d <build_dir>` itself;
  `<args>` is passed through verbatim and only needs the variant-selecting
  flags. The `Matrices` and `Particle` entries are a working example -
  `yeyushengfan258/Matrix-grub-theme` and `...Particle-grub-theme` commit no
  static theme folder (just raw `backgrounds/`, `common/`, `config/`, plus
  `generate.sh`/`install.sh`/`core.sh`), so the registry line is:
  ```
  Matrices|https://github.com/yeyushengfan258/Matrix-grub-theme|generate:-t window -s 1080p|...
  ```
  which runs `generate.sh -d <build_dir> -t window -s 1080p` and harvests
  whatever single directory it produces. This contract depends on the
  upstream script accepting a `-d`/`--dest` output flag and writing exactly
  one result directory per invocation - check the upstream script before
  assuming it holds for a new repo.
- `TAGS` is comma-separated, no spaces.
- Verify the entry resolves before submitting a PR:
  ```bash
  ./theamify get <name>
  ./theamify info <name>
  ```
  `theamify get` should report a valid `theme.txt`. If it can't find one,
  the `SUBDIR` is wrong, the repo needs a `generate:<args>` entry instead of
  a plain path, or the repo bundles multiple themes (a "pack" of several
  pre-built variants in one repo) and `SUBDIR` needs to point at one
  specific variant rather than the repo root. Fix the entry or flag it as
  unsupported in a comment above the line, don't paper over the error.

## Before submitting a PR

```bash
bash -n theamify lib/*.sh install.sh uninstall.sh update.sh   # syntax check
shellcheck theamify lib/*.sh install.sh uninstall.sh update.sh  # if installed
```

Manually exercise any command path you touched - `theamify` has no automated
test suite, so a syntax-clean script that fails at runtime is the common
failure mode. At minimum, run `list`, `status`, and `info <name>` against the
default registry, and `--no-color` against the same to confirm output stays
readable with colors stripped. If you touched anything that clones or
downloads (`get`, `update`, `lib/utils.sh`, `lib/themes.sh`), also run
`theamify get --all` against a clean cache end to end - that's the path most
likely to hide a stdout/stderr leak (see the code conventions note above),
since most other commands never run anything through `$(...)` capture.

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
