# Contributing to theamify

Thanks for considering a contribution to **theamify** — a Linux-only GRUB theme
manager published on npm as **`theamify-cli`**.

## Platform scope

theamify configures **GRUB**, which only exists on Linux. As such, this project
is Linux-only by design. The CLI refuses non-Linux platforms up-front with a
clear message. Code contributions should not assume macOS/Windows support.

## Getting Started

1. Fork the repository on GitHub (`DonArtkins/theamify`).
2. Clone your fork locally.
3. Install dependencies: `npm install`
4. Make your changes and test them locally.

## Project layout

- `src/cli.js` — command router + signal safety net + Linux-only guard
- `src/commands/manage.js` — doctor / status / upgrade / repair / update / uninstall
- `src/core/engine.js` — runtime provisioning, repair & engine forwarding
- `src/lib/` — self.js (self-update/uninstall), tools.js (chafa/grub-customizer), conf.js
- `vendor/` — the bundled bash engine (`vendor/theamify` + `lib/`)
- `test/` — unit tests (`node --test`)

## Key conventions

- **Engine lockstep**: if you bump the npm version, keep `readonly VERSION` in
  `vendor/theamify` in sync (and re-sync `update.sh` if relevant) so the wizard
  never nags.
- **`theamify update` contract**: it must check the npm registry first (offer to
  install a newer CLI), then refresh companion tools, then re-download themes.
- Keep every change covered by a test where practical.

## Testing

```bash
npm test          # syntax-check the bash engine + run node --test
npm run publish:dry-run
```

Please run tests before submitting a pull request.

## Pull Request Process

1. Keep install/update instructions in the README up to date.
2. Make sure `npm test` passes.
3. Update the README, CHANGELOG, and any command help for user-visible changes.
4. Open a pull request against the `main` branch.

## Maintainer Releases

Use the GitHub Actions `Publish to NPM` workflow (OIDC) on `main`, or release
locally from a clean `main`:

```bash
npm run release:patch   # or minor / major — runs tests + bumps + tags + pushes
npm publish --access public
```

Every publish needs a new SemVer. See `.github/workflows/publish.yml`.

## Code of Conduct

Please be respectful and considerate. Harassment or abusive behavior will not
be tolerated.
