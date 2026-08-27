# 🎨 theamify

> **GRUB Theme Manager & Interactive Browser Wizard**  
> Browse, **preview (terminal thumbnails)**, download and apply GRUB boot themes — powered by the original `theamify` engine, now on npm as **`theamify-cli`**.

---

## 🚀 Install (global — run from anywhere)

**One command, installed globally so `theamify` works from any directory on your machine:**

```bash
npm install -g theamify-cli
```

The `-g` global flag puts the `theamify` command on your system `PATH` (or provisions a user-local runtime), so you can call it from **any folder and any terminal**:

```bash
theamify                    # ✨ interactive theme browser wizard
theamify list               # list all themes with status
theamify info <name>        # details + terminal preview (needs chafa)
theamify get <name>         # download & cache a theme
sudo theamify use <name>    # apply to GRUB + rebuild
theamify status             # GRUB & dependency status
theamify doctor             # diagnose install, GRUB & dependencies
theamify uninstall          # remove theamify (asks before deleting anything)
```

> 💡 Already installed? Upgrading is the same command — npm's **global** install fetches the latest release and your downloaded themes & registry edits are preserved:
>
> ```bash
> npm install -g theamify-cli@latest
> ```

> 🧰 Prefer a zero-install run (no permanent install)? Use npx directly:
>
> ```bash
> npx -y theamify-cli
> ```

---

## ✨ What's New in v1.0.0 (npm wizard release)

| Feature | Details |
|---|---|
| 🧙 **Interactive browser wizard** | `theamify` with no args → a clack-powered picker (mirroring GitSwitch) to **browse → preview → apply** |
| 🖼️ **Terminal thumbnail preview** | Pick a theme and see its actual boot-screen preview inline via `chafa` before you commit |
| 📦 **npm global install** | One command, run from anywhere — engine provisions itself under `~/.local/share/theamify` (writable, no sudo needed) |
| 🩺 **`theamify doctor`** | Diagnose install, GRUB, active theme, registry & dependencies |
| ⌨️ **Ctrl+C / Ctrl+Z safe** | Terminal signal safety net so interactive `sudo` during `use` is interruptible |

---

## 📋 Requirements

| Tool | Purpose |
|---|---|
| `bash` | Runs the theamify engine |
| `git` | Downloading / cloning themes |
| `curl` **or** `wget` | Downloading |
| `chafa` | Terminal thumbnail previews — **auto-installed by the wizard** |
| `sudo` | Only applying a GRUB theme (`theamify use`) |

---

## Rosetta Stone — classic tool vs npm CLI

The npm CLI is a thin Node wrapper around the original Bash engine, so every
non-interactive command still behaves identically:

| npm CLI | Original tool |
|---|---|
| `theamify list` | `theamify list` |
| `theamify get <n>` | `theamify get <n>` |
| `sudo theamify use <n>` | `sudo theamify use <n>` |
| `theamify info <n>` | `theamify info <n>` |
| `theamify add/del/remove/open/update` | same names |

`theamify <no args>` is where the wizard differs — it opens the interactive
browser/preview/apply flow instead of the flat TUI menu.

---

## Theme Previews in the Terminal

chafa is a **first-class dependency of the wizard** — the first step of every
wizard run ensures it's present (installing it when missing), updates it on
`theamify update`, and removes it on `theamify uninstall`.

```bash
theamify            # Step 1: ensures chafa (prompts to install if missing)
```

Or check/install it directly via your package manager:
```bash
sudo apt install chafa
```

```bash
theamify                                # pick a theme → auto-preview
theamify info <name>                    # details + thumbnail preview
theamify update                         # also updates chafa
```

---

## Themes Included

| Name | Style | Source |
|---|---|---|
| CyberEXS | Cyberpunk dark | [gnome-look](https://www.gnome-look.org/p/1968990) |
| CyberSynchro | Cyberpunk teal | [gnome-look](https://www.gnome-look.org/p/1972621) |
| Space-Isolation | Sci-Fi | [gnome-look](https://www.gnome-look.org/p/2296342) |
| Kawaii-GRUB | Anime | [gnome-look](https://www.gnome-look.org/p/2218890) |
| Kayoko-Onikata | Anime / Cat | [gnome-look](https://www.gnome-look.org/p/2350900) |
| Matrices | Abstract tech | [gnome-look](https://www.gnome-look.org/p/2271298) |
| Particle | Abstract | [gnome-look](https://www.gnome-look.org/p/2269763) |
| Zzz-GRUB | Chill / Cat | [gnome-look](https://www.gnome-look.org/p/2354136) |

---

## 📁 Project Structure (npm package)

```
bin/theamify.js         # npm bin → src/cli.js
src/cli.js              # command router + signal safety net
src/core/engine.js      # runtime provisioning & engine forwarding
src/lib/conf.js         # themes.conf registry parser
src/commands/manage.js  # doctor / status / uninstall
src/wizard/browse.js    # interactive browser + chafa preview + apply
vendor/                 # bundled bash engine (theamify + lib/ + config/)
```

---

## 🗑 Uninstalling

```bash
theamify uninstall          # interactive — removes the engine runtime
npm uninstall -g theamify-cli
```

Your active GRUB theme and `/etc/default/grub` settings are always preserved.

---

## 📄 License

MIT — see [LICENSE](LICENSE). Don Artkins 2026.

## Project Structure
```bash
theamify/

|-- theamify              # Main CLI executable

|-- install.sh            # System-wide installer

|-- uninstall.sh          # Remover

|-- update.sh             # Self-updater (git pull + reinstall)

|-- lib/

|   |-- colors.sh         # ANSI colors & UI components

|   |-- utils.sh          # Helpers, git clone, dep checks

|   |-- grub.sh           # GRUB detection & apply logic

|   `-- themes.sh         # Theme registry CRUD & download

|-- config/

|   `-- themes.conf       # Theme registry database

|-- themes/               # Downloaded theme cache (auto-populated)

|-- .repo_cache/          # Git clone cache (auto-populated)

|-- .gitignore

|-- LICENSE                # MIT

`-- CONTRIBUTING.md
```

## Install

```bash
git clone https://github.com/DonArtkins/theamify
cd theamify
sudo ./install.sh
```

After install, `theamify` is available system-wide - run it from any terminal.  
Only `theamify use` requires `sudo`. All other commands run as a normal user.

### Updating an existing install

`install.sh` deliberately leaves an already-installed `config/themes.conf`
alone, so your own `add`/`del` edits via `theamify` survive a reinstall.
That also means a plain `sudo ./install.sh` will **not** pick up registry
changes from this checkout (new/removed/edited entries) - pass `--sync-conf`
when you want that:

```bash
sudo ./install.sh --sync-conf
```

See [CONTRIBUTING.md](CONTRIBUTING.md#developing-against-an-existing-install)
for the full dev-vs-installed workflow.

## Usage

```bash
theamify                    # Interactive TUI menu
theamify list               # List all themes with status
theamify info <name>        # Show details + preview (needs chafa)
theamify get <name>         # Download & cache a theme
theamify get --all          # Download every theme
sudo theamify use <name>    # Apply theme to GRUB + rebuild
theamify update <name>      # Re-download one theme
theamify update             # Re-download all cached themes
theamify open <name>        # Open source page in browser
theamify add <github-url>   # Add new theme to registry
theamify del <name>         # Remove theme from registry
theamify remove <name>      # Clear local cache (keeps registry entry)
theamify status             # Show GRUB + dependency status
theamify clean               # Clear repo clone cache
```

## Theme Previews in Terminal

Install `chafa` for inline image previews in `theamify info`:

```bash
sudo apt install chafa
```

## Themes Included

| Name             | Style           | Source |
|------------------|-----------------|--------|
| CyberEXS         | Cyberpunk dark  | [gnome-look](https://www.gnome-look.org/p/1968990) |
| CyberSynchro     | Cyberpunk teal  | [gnome-look](https://www.gnome-look.org/p/1972621) |
| Space-Isolation  | Sci-Fi          | [gnome-look](https://www.gnome-look.org/p/2296342) |
| Kawaii-GRUB      | Anime           | [gnome-look](https://www.gnome-look.org/p/2218890) |
| Kayoko-Onikata   | Anime / Cat     | [gnome-look](https://www.gnome-look.org/p/2350900) |
| Matrices         | Abstract tech   | [gnome-look](https://www.gnome-look.org/p/2271298) |
| Particle         | Abstract        | [gnome-look](https://www.gnome-look.org/p/2269763) |
| Zzz-GRUB         | Chill / Cat     | [gnome-look](https://www.gnome-look.org/p/2354136) |

> **Matrices / Particle note:** both repos ship no pre-built theme folder -
> `backgrounds/`, `common/`, and `config/` are raw assets, and `theme.txt` is
> only produced at build time by their `generate.sh` (`-t [window|sidebar]
> -s [1080p|2k|4k]`). The registry entries use a `generate:<args>` SUBDIR so
> `theamify get` drives that script automatically - see CONTRIBUTING.md for
> how that mechanism works if you want to add another theme shaped like this.

## Add Your Own Theme

```bash
theamify add https://github.com/someone/their-grub-theme
```

Follow the interactive wizard - it asks for name, subdir, description, and tags,
then appends the entry to `themes.conf`.

## Uninstall

```bash
sudo ./uninstall.sh
```

Your active GRUB theme and `/etc/default/grub` settings are preserved.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and how
to submit a theme or a patch.

## License

MIT - see [LICENSE](LICENSE). Don Artkins 2026.
