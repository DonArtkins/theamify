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
theamify                    # ✨ interactive wizard (detects tools → browse → preview → apply)
theamify list               # list all themes with status
theamify info <name>        # details + terminal preview
theamify get <name>         # download & cache a theme
sudo theamify use <name>    # apply to GRUB + rebuild
theamify update             # update tools (chafa, grub-customizer) + re-download themes
theamify status             # GRUB & dependency status
theamify doctor             # diagnose install, GRUB, tools & dependencies
theamify uninstall          # remove only theamify (keeps chafa & grub-customizer)
```

> 💡 Upgrading is the same command — `npm install -g theamify-cli@latest`, and your downloaded themes & registry edits are preserved.  
> 🧰 Zero-install run (no permanent install): `npx -y theamify-cli`

---

## ✨ What's New (v1.1.0 — npm release)

| Feature | Details |
|---|---|
| 🧙 **Interactive wizard** | One command: detect companion tools → pick theme → **preview** → apply |
| 🧩 **Auto-detected companion tools** | **chafa** (thumbnails) + **grub-customizer** (GUI) are detected first; installed if missing, or **option to update** if present — then it continues on its own |
| 🖼️ **Terminal thumbnail preview** | See the boot-screen image inline via `chafa` before you commit |
| 📦 **npm global install** | Engine provisions itself user-writable (no sudo for downloads) |
| 🩺 **`theamify doctor`** | Diagnose install, GRUB, active theme, registry, tools & dependencies |
| 🗑 **Safe uninstall** | Removes **only theamify** — leaves chafa & grub-customizer for later use |
| ⌨️ **Ctrl+C / Ctrl+Z safe** | Signal safety net; interactive `sudo` is never frozen |

---

## 🧭 Wizard Sequence (every `theamify` run)

1. **Detect companion tools** — `chafa` then `grub-customizer`. For each:  
   - **Already installed?** → *“Update it now? (or just continue)”* — Continue moves on.  
   - **Missing?** → *“Install `<name>`? Yes/No”* → installs via your package manager (`sudo`), then continues.  
2. **Show the theme picker** — every registry theme with status (`[REMOTE]`/`[CACHED]`/`[ACTIVE]`).
3. **Pick a theme** → optional **terminal thumbnail preview** (needs `chafa`).
4. **Act** — download, apply to GRUB, or open in browser.

> Companion tools are installed strictly **before** the browser, so previews are ready when you need them.

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
│   ├── core/engine.js      # runtime provisioning & engine forwarding
│   ├── commands/manage.js  # doctor / status / uninstall
│   ├── wizard/browse.js    # interactive wizard (browse → preview → apply)
│   └── lib/
│       ├── conf.js         # themes.conf registry parser
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
- **`theamify uninstall`** removes **only** theamify — chafa and grub-customizer stay on the system for later use.

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
