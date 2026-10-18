<p align="center">
  <img src="https://raw.githubusercontent.com/withvariablelab/dx/HEAD/vland/cli/brand/sign-readme.svg" width="64" height="64" alt="">
</p>

<h1 align="center">vland</h1>

<p align="center">Starts a project in Variable Land.</p>

## Prerequisites

- Node.js >= 22.18.0

## Installation

Run it directly with `npx`:

```sh
npx @variablelab/vland init
```

…or install it globally:

```sh
pnpm add -g @variablelab/vland
vland init
```

## Usage

```sh
vland init                        # interactive
vland init my-app -t library      # explicit template
vland init my-app -t backend --no-install --no-git
```

See [`CLI.md`](./CLI.md) for the full reference (auto-generated per release).

### Templates

| Template   | What you get                                                                              |
| ---------- | ----------------------------------------------------------------------------------------- |
| `library`  | A standalone TypeScript library with Vitest + Changesets release workflow.                |
| `backend`  | An Elysia (`@elysiajs/node`) backend with evlog, Vitest, Dockerfile, CI shape.            |
| `monorepo` | pnpm + Turbo workspace with an Elysia API, a Vite-React SPA, and a few internal packages. |

All templates target Node.js, pin Node.js and pnpm with [mise](https://mise.jdx.dev) (`mise.toml` and `mise.lock`), run their GitHub Actions on SHA-pinned actions checked by [zizmor](https://docs.zizmor.sh), and ship [`@rrlab/cli`](https://github.com/withvariablelab/dx/tree/main/run-run) (`rr`) as the single entry point for lint, format, type-check, and build. The per-tool config files (`biome.json`, `tsconfig.json`, `tsdown.config.ts`) are not bundled — run `rr plugins add biome ts tsdown` (one at a time) in your new project to opt in. See the scaffolded README for the exact post-install setup.

## Shell completion

`vland` ships a `completion` subcommand that prints a shell-specific script. Add a guarded eval to your shell rc file:

```sh
# zsh — ~/.zshrc
command -v vland >/dev/null 2>&1 && eval "$(vland completion zsh 2>/dev/null)"

# bash — ~/.bashrc
command -v vland >/dev/null 2>&1 && eval "$(vland completion bash 2>/dev/null)"

# fish — ~/.config/fish/config.fish
command -v vland >/dev/null 2>&1; and vland completion fish 2>/dev/null | source
```

The `command -v` guard skips the line when no `vland` is on `PATH`. The `2>/dev/null` covers a mise shim with no active version: it passes the guard, then fails on stderr. If completion doesn't load, run `vland completion zsh` by hand to see why.

**Prerequisite:** the [`usage`](https://usage.jdx.dev) CLI must be on your `PATH` (it powers completion at runtime). Install via one of:

```sh
mise use -g usage
brew install usage
```

When you upgrade `@variablelab/vland`, the next shell session will pick up new commands automatically — no need to re-run anything.

## Troubleshooting

To enable debug mode, set the `DEBUG` environment variable to `vland:*` before running *any* command.

```sh
DEBUG=vland:* vland init my-app
```

To point `init` at local templates instead of fetching from GitHub (useful when developing inside this monorepo):

```sh
VLAND_TEMPLATES_DIR=/absolute/path/to/dx/vland/templates vland init my-app -t library
```
