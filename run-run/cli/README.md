<p align="center">
  <img src="https://raw.githubusercontent.com/withvariablelab/dx/HEAD/run-run/cli/brand/sign-readme.svg" width="64" alt="">
</p>

<h1 align="center"><a href="https://lab.variable.land/run-run">run-run</a></h1>

<p align="center">One way to run the scripts in a repo.</p>

`rr` gives a repo one set of commands, such as `rr check`, `rr test` and `rr pack`. Every tool behind them is a plugin you add, so the commands stay the same in every repo.

## Install

```sh
pnpm add -D @rrlab/cli
```

It adds the `rr` command to your project. It needs Node 22.18 or later.

## Usage

Print the commands and options:

```sh
pnpm rr --help
```

> If you have `node_modules/.bin` on your `PATH` (e.g. via `mise` or `direnv` — see [Shell completion](#shell-completion)), you can drop the `pnpm` prefix and invoke `rr` directly.

The [CLI reference](https://github.com/withvariablelab/dx/blob/main/run-run/cli/CLI.md) lists every command and flag. It is generated on each release.

## Plugins

`rr` is a microkernel: every tool lives in its own `@rrlab/<tool>-plugin` package. The official plugins are:

| Plugin   | Wraps                                                                                                           | Install                 |
| -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `astro`  | [astro check](https://docs.astro.build/en/reference/cli-reference/#astro-check)                                 | `rr plugins add astro`  |
| `biome`  | [Biome](https://biomejs.dev)                                                                                    | `rr plugins add biome`  |
| `oxc`    | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) | `rr plugins add oxc`    |
| `ts`     | [tsc](https://www.typescriptlang.org)                                                                           | `rr plugins add ts`     |
| `tsdown` | [tsdown](https://tsdown.dev)                                                                                    | `rr plugins add tsdown` |
| `vitest` | [vitest](https://vitest.dev)                                                                                    | `rr plugins add vitest` |

Install one with:

```sh
rr plugins add biome
```

This installs `@rrlab/biome-plugin` plus its peer tool and shared config, scaffolds `biome.json` if missing, and wires the plugin into `run-run.config.{ts,mts}`.

To install from a specific dist-tag (e.g. a [PR preview release](https://github.com/withvariablelab/dx/blob/main/docs/development.md#preview-releases) published as `pr-<number>`, or a custom tag), append `@<spec>`:

```sh
rr plugins add biome@pr-<number>   # preview tag
rr plugins add biome@<dist-tag>    # any dist-tag
rr plugins add biome@^1.0.0        # explicit version range (sibling configs still use latest)
```

When the spec is a dist-tag, `rr` resolves any `@rrlab/*-config` sibling at the same tag, falling back to `latest` if the registry doesn't have the sibling at that tag.

## Git hooks

`@rrlab/cli` ships two [lefthook](https://lefthook.dev) configs that a repo extends:

- `lefthook/base.yml` runs three jobs in parallel on each commit:
  - `rr jsc --fix-staged` on the staged files;
  - `rr tsc` when a TypeScript file or a tsconfig changes;
  - [gitleaks](https://github.com/gitleaks/gitleaks) on the staged changes.
- `lefthook/turborepo.yml` runs the tests of the packages Turborepo finds affected on each push. On `main`, it runs those of the packages the last commit changed.

A Turborepo monorepo's `lefthook.yml`:

```yaml
extends:
  - node_modules/@rrlab/cli/lefthook/base.yml
  - node_modules/@rrlab/cli/lefthook/turborepo.yml
```

A repo without Turborepo extends `base.yml` and writes its own `pre-push` jobs.

The configs run through pnpm and expect:

- `@rrlab/cli` and `lefthook` in the root `package.json`, with lefthook allowed to run its install script, so `pnpm install` installs the hooks;
- gitleaks pinned in the repo's `mise.toml`;
- a plugin for `rr jsc` and one for `rr tsc` in `run-run.config`.

lefthook merges jobs that share a name, and the extended file wins. So your `lefthook.yml` can add jobs, or set `skip: true` on a shared job. To change what a shared job runs, put your version in a file listed after it in `extends`.

lefthook skips a file in `extends` that doesn't exist, without a warning. So no shared job runs when `node_modules/@rrlab/cli` is missing, or older than 1.7.0, the first version that ships these files.

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

### The usage CLI

Completion runs on the [`usage`](https://usage.jdx.dev) CLI, so it has to be on your `PATH`. Install it with one of:

```sh
mise use -g usage
brew install usage
```

## Troubleshooting

To enable debug mode, set the `DEBUG` environment variable to `run-run:*` before running _any_ command.

```sh
DEBUG=run-run:* pnpm rr <command>
```

## License

The code is [MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE). The Sign in `brand/` is not: its use is set by [BRAND-USE.md](https://github.com/withvariablelab/brand/blob/main/BRAND-USE.md).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
