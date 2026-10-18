# {{projectName}}

variableland-flavoured Node.js monorepo: pnpm workspaces + Turborepo + Vitest.

## What's inside

### Apps

| App                      | Description                                   |
| ------------------------ | --------------------------------------------- |
| [`apps/api`](./apps/api) | Elysia (`@elysiajs/node`) backend with evlog. |
| [`apps/web`](./apps/web) | Minimal Vite + React SPA.                     |

### Packages

| Package                              | Description                                                |
| ------------------------------------ | ---------------------------------------------------------- |
| [`packages/types`](./packages/types) | Shared zod schemas, consumed by `apps/api` and `apps/web`. |

## Prerequisites

[mise](https://mise.jdx.dev) 2026.9.16 or later. It installs the Node.js and pnpm versions pinned in `mise.toml` and `mise.lock`, the same ones CI uses. Without mise, you need Node.js 22.18.0 or later, because `rr` loads `run-run.config.mts` with Node's built-in type stripping, and pnpm 10.30.3.

## Getting started

```sh
mise install
pnpm install
pnpm dev
```

## Set up tooling

This project uses [`rr`](https://github.com/withvariablelab/dx/tree/main/run-run) (the `@rrlab/cli`) as the single entry point for lint, format, type-check, and build. The pre-configured `mise.toml` puts `./node_modules/.bin` on your `PATH`, so `rr` is invokable directly from anywhere inside the repo.

It starts with no plugins. Add the ones you want: each one installs itself, writes its own config file and registers itself in the `run-run.config.mts` of the folder you run it in.

```sh
# Workspace-wide formatting + linting (lives at root)
rr plugins add biome

# Type-checking iterates every workspace when invoked at root.
# Install ts-plugin at root (decline scaffolding root tsconfig.json; with --yes
# it's created, and rr tsc still checks the workspaces, not the root),
# then install it inside each workspace that needs its own tsconfig.
rr plugins add ts                                                          # at root
cd apps/api       && pnpm rr plugins add ts && pnpm rr plugins add tsdown && cd ../..
cd apps/web       && pnpm rr plugins add ts                                && cd ../..   # the "React app" preset
cd packages/types && pnpm rr plugins add ts && pnpm rr plugins add tsdown && cd ../..
```

Inside a workspace folder, prefix with `pnpm` (`pnpm rr <cmd>`) — pnpm resolves `rr` from the workspace root's `node_modules/.bin`.

Each `rr plugins add` asks before writing a config file. `--yes` takes the defaults without asking: use it from an agent or a script. `rr plugins add vitest` runs the tests through `rr test`, and `rr plugins remove <name>` undoes an add.

For oxlint and oxfmt instead of Biome, run `rr plugins add oxc` in place of `biome`, then narrow it to `oxc({ only: ["lint", "format"] })` in `run-run.config.mts`, so that `ts` keeps the type-check.

CI runs `rr check` at the root, then `pnpm test` and `pnpm build` for the workspaces a PR affects.

## Develop

| Command                   | Purpose                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`                | `turbo run dev` across every app.                                                                  |
| `pnpm build`              | `turbo run build`.                                                                                 |
| `pnpm test`               | `turbo run test` across every workspace with tests.                                                |
| `rr check` (root)         | Lint + format check on the whole repo, then type-check every workspace that has a `tsconfig.json`. |
| `rr jsc --fix` (root)     | Auto-fix lint + format on the whole repo.                                                          |
| `rr pack` (per workspace) | Bundle the workspace's `src/index.ts` via tsdown.                                                  |
