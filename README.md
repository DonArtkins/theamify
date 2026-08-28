# 🎨 theamify

> **GRUB Theme Manager & Interactive Browser Wizard**  
> Browse, **preview (terminal thumbnails)**, download and apply GRUB boot themes — now on npm as **`theamify-cli`**.

---

## 🚀 Install (global — run from anywhere)

**One command, installed globally so `theamify` works from any directory on your machine:**

```bash
npm install -g theamify-cli
```

The `-g` flag puts the `theamify` command on your system `PATH` (or provisions a user-local runtime under `~/.local/share/theamify`), so you can call it from **any folder and any terminal**:

```bash
theamify                    # ✨ interactive wizard (self-check → tools → download → browse → apply)
theamify list               # list all themes with status
theamify info <name>        # details + terminal preview
theamify get <name>         # download & cache a theme
theamify get --all          # download every theme up front
sudo theamify use <name>    # apply to GRUB + rebuild
theamify update             # update tools (chafa, grub-customizer) + re-download themes
theamify status             # GRUB & dependency status
theamify doctor             # diagnose install, GRUB, tools & dependencies
theamify upgrade            # check for & install the latest npm version
theamify repair             # fix a broken install (re-provision the engine)
theamify uninstall          # remove theamify entirely (incl. npm package)
theamify version            # print the version
theamify help               # show all commands
```

> **Command aliases** — `ls` (list), `show` (info), `get`/`fetch`/`download`, `use`/`apply`/`set`, `rm`/`uncache` (remove), `del`/`delete`, `purge-cache` (clean), `browse`/`wizard`/`install` (wizard).  \
> **Version flags** — `-v`, `-V`, `--version`  ·  **Help flags** — `-h`, `--help`

> 💡 Upgrading is the same command — `npm install -g theamify-cli@latest`, and your downloaded themes & registry edits are preserved.  
> 🧰 Zero-install run (no permanent install): `npx -y theamify-cli`

---

## ✨ What's New (v2.2.5 — doc refresh & command parity)

| Feature | Details |
|---|---|
| 📖 **README synced** | Every command + alias documented and verified against the live CLI: `list`/`ls`, `info`/`show`, `get`/`fetch`/`download`, `use`/`apply`/`set`, `remove`/`rm`/`uncache`, `add`/`del`/`delete`, `update`, `open`, `status`, `doctor`, `upgrade`/`self-update`, `repair`, `browse`/`wizard`/`install`, `uninstall`, `clean`/`purge-cache`, `version`, `help` |
| 🗑️ **Uninstall contract** | After `theamify uninstall`, `theamify` reports `command not found` (new terminal) — clear the current shell's cache with `hash -r` |

## ✨ What's New (v2.2.4 — command-not-found clarity)

| Feature | Details |
|---|---|
| 💡 **Current-terminal hint** | After uninstall, `theamify` is fully deleted — a **new terminal** reports `bash: theamify: command not found`. If your *current* shell still says `No such file or directory`, that's bash's cached command path — clear it with `hash -r` |
| 🗑️ **Still removes everything** | Every runtime, theme, GRUB theme, npm package, `~/.local/bin/theamify` shadow and PATH marker |

## ✨ What's New (v2.2.3 — complete uninstall)

| Feature | Details |
|---|---|
| 🗑️ **Uninstall removes EVERYTHING** | `theamify uninstall` now removes **every** runtime tree (`~/.local/share/theamify` AND `/usr/local/share/theamify`), all downloaded themes, the applied GRUB theme, the `theamify-cli` npm package **and** `~/.local/bin/theamify` (legacy shadow, file or symlink) plus every PATH marker from `~/.bashrc`/`~/.zshrc` |
| ✅ **`command not found` guaranteed** | After uninstall, `theamify` shadows nothing on PATH — typing it returns `bash: theamify: command not found`, exactly like any tool you never installed |
| 🔒 **One confirmation** | A single confirmation covers the whole removal (no more piecemeal "keep the npm package?" prompts) |
| 🩹 **Regression-tested** | `removeUserBin` (symlink + real-file shadow), runtime-tree removal and rc cleanup are all covered by tests |

## ✨ What's New (v2.2.2 — uninstall crash hotfix)

| Feature | Details |
|---|---|
| 🩹 **`ReferenceError: path is not defined` fixed** | The v2.2.1 uninstall crashed while stripping leftover PATH markers from `~/.bashrc`/`~/.zshrc` — `cleanRcMarkers` used `path`/`os`/`fs` without importing them. Now fixed with proper `node:` imports and guarded by regression tests. |
| 🔄 **Engine lockstep to v2.2.2** | Bundled engine `VERSION` bumped to match the npm package — no more "update available" nag after a fresh install. |

## ✨ What's New (v2.2.1 — release)

| Feature | Details |
|---|---|
| 🧙 **Interactive wizard** | One command: detect companion tools → pick theme → **preview** → apply |
| 🧩 **Auto-detected companion tools** | **chafa** (thumbnails) + **grub-customizer** (GUI) are detected first; installed if missing, or **option to update** if present — then it continues on its own |
| 🖼️ **Thumbnail by default** | Selecting a cached theme renders its terminal thumbnail **automatically** (no separate “preview” item) |
| 📦 **npm global install** | Engine provisions itself user-writable (no sudo for downloads) |
| 🩺 **`theamify doctor`** | Diagnose install, GRUB, active theme, registry, tools & dependencies |
| 🗑 **Complete uninstall** | Deletes **ALL downloaded themes**, resets GRUB to default, removes the `theamify-cli` npm package **and** strips leftover PATH markers from `~/.bashrc`/`~/.zshrc` — after which `theamify` gives a normal `command not found` |
| ⌨️ **Ctrl+C / Ctrl+Z safe** | Signal safety net; interactive `sudo` is never frozen |
| 🔄 **Self-manage (v2.2+)** | `upgrade`, `repair`, auto-update check on every wizard run |
| 🧹 **Install-flow download-all** | Wizard offers to download every theme up front so each one is instantly previewable/applicable |

---

## 🧭 Wizard Sequence (every `theamify` run)

1. **Self-check** — checks npm for a newer `theamify-cli`; offers to update if found. Also self-repairs the engine/runtime.
2. **Detect companion tools** — `chafa` then `grub-customizer`. For each:  
   - **Already installed?** → *“Update it now? (or just continue)”* — Continue moves on.  
   - **Missing?** → *“Install `<name>`? Yes/No”* → installs via your package manager (`sudo`), then continues.  
3. **Download all themes** — asks *“Download all themes now?”* (default Yes) → fetches the whole registry so every theme is instantly previewable/applicable.
4. **Show the theme picker** — every registry theme with status (`[REMOTE]`/`[CACHED]`/`[ACTIVE]`).
5. **Pick a theme** → the **terminal thumbnail renders automatically** below the selection (no separate “preview” menu item).
6. **Act** — download/update, apply to GRUB, or open in browser. Choose `← Back to theme list` to keep browsing (the wizard never hard-exits until you pick **Quit**).

> Companion tools and themes are ready **before** the browser, so thumbnails & applies are instant when you need them.

---

## 📋 Requirements

| Tool | Purpose |
|---|---|
| `bash` | Runs the theamify engine |
| `git` | Downloading / cloning themes |
| `curl` **or** `wget` | Downloading |
| `chafa` | Terminal thumbnail previews — **auto-installed by the wizard** |
| `grub-customizer` | GUI to tweak GRUB menu — **auto-installed by the wizard** |
| `sudo` | Tool installs + applying a GRUB theme (`theamify use`) |

---

## 📁 Project Structure (npm package)

```
theamify/
├── bin/theamify.js         # npm bin entry → src/cli.js
├── src/
│   ├── cli.js              # command router + signal safety net
│   ├── core/engine.js      # runtime provisioning, repair & engine forwarding
│   ├── commands/manage.js  # doctor / status / upgrade / repair / uninstall
│   ├── wizard/browse.js    # interactive wizard (self-check → browse → preview → apply)
│   └── lib/
│       ├── conf.js         # themes.conf registry parser
│       ├── self.js         # version-check / self-update / self-uninstall / rc cleanup
│       └── tools.js        # companion tools: chafa + grub-customizer
├── vendor/                 # bundled bash engine (theamify + lib/ + config/)
├── test/                   # unit tests (node:test)
├── package.json
└── .github/workflows/     # ci.yml + publish.yml (npm OIDC)
```

---

## Rosetta Stone — CLI vs classic tool

The npm CLI is a thin wrapper around the original Bash engine; every non-interactive command behaves identically:

| npm CLI | Original tool |
|---|---|
| `theamify list` | `theamify list` |
| `theamify get <n>` | `theamify get <n>` |
| `sudo theamify use <n>` | `sudo theamify use <n>` |
| `theamify info <n>` | `theamify info <n>` |
| `theamify add/del/remove/open/update` | same names |

`theamify <no args>` differs — it runs the interactive wizard (tools-then-browser) instead of the flat TUI menu.

---

## 🧩 Companion Tools: chafa & grub-customizer

The wizard manages two companion tools as first-class:

| Tool | Purpose | Install command (apt) | Lifecycle |
|---|---|---|---|
| `chafa` | Renders theme thumbnails in the terminal | `sudo apt install chafa` | auto-installed/updated by wizard |
| `grub-customizer` | GUI for GRUB menu & theme tweaks | `sudo apt install grub-customizer` | auto-installed/updated by wizard |

**Behavior:**  
- **Detect** → if present, offer to update; if absent, install (with your consent).  
- **Continue** regardless of Yes/No — the wizard proceeds to the theme picker.  
- **`theamify update`** updates tools then re-downloads themes.
- **`theamify uninstall`** removes **everything theamify owns**: the runtime + all downloaded themes, resets GRUB to the default boot menu, removes the `theamify-cli` npm package, and strips leftover PATH markers from `~/.bashrc` / `~/.zshrc`. Companion tools **chafa** and **grub-customizer** stay on the system for later use — run the command after that and you get a normal `command not found`.
- **`theamify upgrade`** checks the npm registry and, if a newer version exists, offers to `npm install -g theamify-cli@latest`.
- **`theamify repair`** re-provisions the engine from the bundled package — the fix for a broken/missing install.
- Every `theamify` (wizard) run also **auto-checks for updates** and **self-repairs** before showing the theme picker.

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

## 📄 License

MIT — see [LICENSE](LICENSE). Don Artkins 2026.
