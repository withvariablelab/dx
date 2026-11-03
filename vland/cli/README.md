<p align="center">
  <img src="https://raw.githubusercontent.com/withvariablelab/dx/HEAD/vland/cli/brand/sign-readme.svg" width="64" alt="">
</p>

<h1 align="center"><a href="https://lab.variable.land/vland">vland</a></h1>

<p align="center">Starts a project in Variable Land.</p>

`vland init` fetches a template from the dx repository and fills in the project's name and author. Then it offers to install the dependencies and to initialise a git repository.

## Install

```sh
pnpm add -g @variablelab/vland
```

It needs Node 22.18 or later.

To run it once without installing it, use `npx`:

```sh
npx @variablelab/vland init
```

## Usage

```sh
vland init                        # interactive
vland init my-app -t library      # explicit template
vland init my-app -t backend --no-install --no-git
```

The [CLI reference](https://github.com/withvariablelab/dx/blob/main/vland/cli/CLI.md) lists every command and flag. It is generated on each release.

### Templates

| Template   | What you get                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `library`  | A standalone TypeScript library with Vitest + Changesets release workflow.                                         |
| `backend`  | An Elysia (`@elysiajs/node`) backend with evlog, Vitest, Dockerfile, CI shape.                                     |
| `monorepo` | pnpm + Turbo workspace with an Elysia API, a Vite-React SPA, and `packages/types`, the zod schemas the apps share. |

All templates target Node.js, pin Node.js and pnpm with [mise](https://mise.jdx.dev) (`mise.toml` and `mise.lock`), run their GitHub Actions on SHA-pinned actions checked by [zizmor](https://docs.zizmor.sh), and ship [`@rrlab/cli`](https://github.com/withvariablelab/dx/tree/main/run-run/cli) (`rr`) as the single entry point for lint, format, type-check, test and build. No plugin is configured: the scaffolded README lists the `rr plugins add` commands to run.

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

Completion runs on the [`usage`](https://usage.jdx.dev) CLI, so it has to be on your `PATH`. Install it with one of:

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

## License

The code is [MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE). The Sign in `brand/` is not: its use is set by [BRAND-USE.md](https://github.com/withvariablelab/brand/blob/main/BRAND-USE.md).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
