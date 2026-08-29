# Changelog

All notable changes to **theamify** are documented here. The `theamify` command
is installed from npm as **`theamify-cli`**. This project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

- `theamify update` now checks the npm registry first and offers to install a
  newer CLI (matching `gitswitch update`), before refreshing companion tools and
  themes.
- Enforced Linux-only guard: theamify manages GRUB boot themes, which only
  exist on Linux. Non-Linux platforms now get a clear error instead of failing
  halfway through.
- Cross-platform CI matrix + documentation.

## [2.3.0] - 2026-08-29

### Added
- `theamify update` pulls the latest CLI from the npm registry (like
  `gitswitch update`), then refreshes companion tools and re-downloads themes.
- Linux-only platform guard with a clear message on unsupported OSes.

## [2.2.5] - 2026-08-29

### Changed
- README fully synced to the live command surface & aliases (doc refresh).

## [2.2.4] - 2026-08-29

### Changed
- Uninstall message documents the `hash -r` / new-terminal guidance so users
  understand `command not found` vs the current shell's cached path.

## [2.2.3] - 2026-08-28

### Added
- **Complete uninstall** — `theamify uninstall` removes *every* runtime tree
  (`~/.local/share/theamify` and `/usr/local/share/theamify`), all downloaded
  themes, the applied GRUB theme, the `theamify-cli` npm package,
  `~/.local/bin/theamify` (shadow, file or symlink) and every PATH marker —
  so afterwards `theamify` reports `command not found`.
- One-confirmation removal covering the whole uninstall.

## [2.2.2] - 2026-08-28

### Fixed
- `ReferenceError: path is not defined` crash in `cleanRcMarkers` during
  uninstall. Added proper `node:` imports and regression tests.

## [2.2.1] - 2026-08-28

### Changed
- Engine `VERSION` lockstepped to the npm package so the wizard never nagged to
  update after a fresh install.

## [2.1.1] - release

Initial npm release line (see README for full feature set).

[2.3.0]: https://github.com/DonArtkins/theamify/releases/tag/v2.3.0
[2.2.5]: https://github.com/DonArtkins/theamify/releases/tag/v2.2.5
[2.2.4]: https://github.com/DonArtkins/theamify/releases/tag/v2.2.4
[2.2.3]: https://github.com/DonArtkins/theamify/releases/tag/v2.2.3
[2.2.2]: https://github.com/DonArtkins/theamify/releases/tag/v2.2.2
[2.2.1]: https://github.com/DonArtkins/theamify/releases/tag/v2.2.1
