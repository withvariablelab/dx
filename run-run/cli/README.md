<p align="center">
  <img src="https://raw.githubusercontent.com/withvariablelab/dx/HEAD/run-run/cli/brand/sign-readme.svg" width="64" height="64" alt="">
</p>

<h1 align="center">run-run</h1>

<p align="center">One way to run the scripts in a repo.</p>

## Prerequisites

- Node.js >= 22.18.0

## Installation

```sh
pnpm add -D @rrlab/cli
```

It adds the `rr` command to your project.

## Usage

Run the help command:

```sh
pnpm rr help
```

> If you have `node_modules/.bin` on your `PATH` (e.g. via `mise` or `direnv` — see [Shell completion](#shell-completion)), you can drop the `pnpm` prefix and invoke `rr` directly.

See [`CLI.md`](./CLI.md) for the full reference (auto-generated per release).

## Plugins

`rr` is a microkernel: every tool lives in its own `@rrlab/<tool>-plugin` package. The official plugins are:

| Plugin   | Wraps                                                                                                          | Install                  |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `astro`  | [astro check](https://docs.astro.build/en/reference/cli-reference/#astro-check)                                | `rr plugins add astro`   |
| `biome`  | [Biome](https://biomejs.dev)                                                                                   | `rr plugins add biome`   |
| `oxc`    | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) | `rr plugins add oxc`     |
| `ts`     | [tsc](https://www.typescriptlang.org)                                                                          | `rr plugins add ts`      |
| `tsdown` | [tsdown](https://tsdown.dev)                                                                                   | `rr plugins add tsdown`  |
| `vitest` | [vitest](https://vitest.dev)                                                                                   | `rr plugins add vitest`  |

Install one with:

```sh
rr plugins add biome
```

This installs `@rrlab/biome-plugin` plus its peer tool and shared config, scaffolds `biome.json` if missing, and wires the plugin into `run-run.config.{ts,mts}`.

To install from a specific dist-tag (e.g. a PR preview release published as `pr-<N>`, or a custom tag), append `@<spec>`:

```sh
rr plugins add biome@pr-226   # preview tag
rr plugins add biome@next     # any dist-tag
rr plugins add biome@^0.1.0   # explicit version range (sibling configs still use latest)
```

When the spec is a dist-tag, `rr` resolves any `@rrlab/*-config` sibling at the same tag, falling back to `latest` if the registry doesn't have the sibling at that tag.

## Shell completion

`rr` ships a `completion` subcommand that prints a shell-specific script.
Pick the option that matches your setup.

### Option A — with `mise` or `direnv` (recommended)

If your tooling puts `node_modules/.bin` on `PATH` per-project, `rr` resolves at shell startup and completion picks up new commands automatically on each new shell. Examples:

```toml
# mise.toml
[env]
_.path = ["{{config_root}}/node_modules/.bin"]
```

```sh
# .envrc (direnv)
PATH_add node_modules/.bin
```

Then add a guarded eval to your shell rc:

```sh
# zsh — ~/.zshrc
command -v rr >/dev/null 2>&1 && eval "$(rr completion zsh 2>/dev/null)"

# bash — ~/.bashrc
command -v rr >/dev/null 2>&1 && eval "$(rr completion bash 2>/dev/null)"

# fish — ~/.config/fish/config.fish
command -v rr >/dev/null 2>&1; and rr completion fish 2>/dev/null | source
```

The `command -v` guard skips the line when no `rr` is on `PATH`. A mise shim still passes it: recent versions of mise keep `~/.local/share/mise/shims` on `PATH` after `mise activate`, even outside any project (the `activate_shims` setting, on by default). Once mise has installed a tool that provides `rr`, such as `npm:@rrlab/cli` in some project's `mise.toml`, an `rr` shim exists in every directory, and where no version is active it fails with `mise ERROR No version is set for shim: rr` on stderr. The `2>/dev/null` discards that error, so the line stays silent outside a project.

The line hides every error, so if completion doesn't load, run `rr completion zsh` by hand to see why.

### Option B — without a per-project PATH manager

Cache the completion script once, then source the cached file from your shell rc. Run the generation step from inside a project that has `@rrlab/cli` installed:

```sh
mkdir -p ~/.cache
pnpm exec rr completion zsh  > ~/.cache/rr-completion.zsh
pnpm exec rr completion bash > ~/.cache/rr-completion.bash
pnpm exec rr completion fish > ~/.cache/rr-completion.fish
```

```sh
# zsh — ~/.zshrc
[ -f ~/.cache/rr-completion.zsh ] && source ~/.cache/rr-completion.zsh

# bash — ~/.bashrc
[ -f ~/.cache/rr-completion.bash ] && source ~/.cache/rr-completion.bash

# fish — ~/.config/fish/config.fish
test -f ~/.cache/rr-completion.fish; and source ~/.cache/rr-completion.fish
```

Regenerate the cache after upgrading `@rrlab/cli` to pick up new commands.

### Prerequisite

The [`usage`](https://usage.jdx.dev) CLI must be on your `PATH` (it powers completion at runtime). Install via one of:

```sh
mise use -g usage
brew install usage
```

## Troubleshooting

To enable debug mode, set the `DEBUG` environment variable to `run-run:*` before running *any* command.

```sh
DEBUG=run-run:* pnpm rr <command>
```
