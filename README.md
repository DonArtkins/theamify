# theamify - GRUB Theme Manager

> A personal GRUB theme manager by **Don Artkins** ([@DonArtkins](https://github.com/DonArtkins))

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
| Elegant-Mountain | Landscape       | [gnome-look](https://www.gnome-look.org/p/2206121) |
| Elegant-Forest   | Landscape       | [gnome-look](https://www.gnome-look.org/p/2206111) |
| Elegant-Mojave   | Desert          | [gnome-look](https://www.gnome-look.org/p/2206118) |
| Elegant-Wave     | Abstract        | [gnome-look](https://www.gnome-look.org/p/2206122) |
| Space-Isolation  | Sci-Fi          | [gnome-look](https://www.gnome-look.org/p/2296342) |
| Kawaii-GRUB      | Anime           | [gnome-look](https://www.gnome-look.org/p/2218890) |
| Kayoko-Onikata   | Anime / Cat     | [gnome-look](https://www.gnome-look.org/p/2350900) |
| Matrices         | Abstract tech   | [gnome-look](https://www.gnome-look.org/p/2271298) |
| Particle         | Abstract        | [gnome-look](https://www.gnome-look.org/p/2269763) |
| Zzz-GRUB         | Chill / Cat     | [gnome-look](https://www.gnome-look.org/p/2354136) |
| Star-Rail        | Gaming / Anime  | [gnome-look](https://www.gnome-look.org/p/2076542) |

> **Elegant themes note:** All 4 Elegant entries point at the same repo
> (`vinceliuice/Elegant-grub2-themes`). Unlike the rest of the registry, that
> repo ships no pre-built theme folder - `backgrounds/`, `common/`, and
> `config/` are raw assets, and `theme.txt` is only produced at build time by
> `install.sh` (writes straight to `/boot/grub`, needs root) or `generate.sh`
> (builds an `Elegant-<theme>-<type>-<side>-<color>` folder into a directory
> you choose, no root needed). theamify doesn't drive either script yet, so
> `theamify get Elegant-Mountain` will clone but fail validation - that's
> expected. Until generate.sh support is wired in, build the variant by hand:
>
> ```bash
> cd .repo_cache/vinceliuice__Elegant-grub2-themes   # after `theamify get`
> ./generate.sh -t mountain -p window -i left -c dark -s 1080p -d /tmp/elegant-out
> ```
>
> then copy `/tmp/elegant-out/Elegant-mountain-window-left-dark` into your
> GRUB themes dir yourself, or just run the upstream `install.sh -b` directly.

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
