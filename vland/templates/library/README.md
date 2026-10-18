# {{projectName}}

A standalone TypeScript library scaffolded with [`@variablelab/vland`](https://github.com/withvariablelab/dx/tree/main/vland/cli).

## Install

```sh
pnpm add {{packageName}}
```

## Usage

```ts
import { greet } from "{{packageName}}";

greet("vland");
```

## Prerequisites

[mise](https://mise.jdx.dev) 2026.9.16 or later. It installs the Node.js and pnpm versions pinned in `mise.toml` and `mise.lock`, the same ones CI uses. Without mise, you need Node.js 22.18.0 or later, because `rr` loads `run-run.config.mts` with Node's built-in type stripping, and pnpm 10.30.3.

```sh
mise install
pnpm install
```

## Set up tooling

This project uses [`rr`](https://github.com/withvariablelab/dx/tree/main/run-run) (the `@rrlab/cli`) as the single entry point for lint, format, type-check, and build. The pre-configured `mise.toml` puts `./node_modules/.bin` on your `PATH`, so `rr` is invokable directly from the project root.

It starts with no plugins. Add the ones you want:

```sh
rr plugins add biome            # lint + format (writes biome.json)
rr plugins add ts               # type-check (writes tsconfig.json)
rr plugins add tsdown           # bundle (writes tsdown.config.ts)
rr plugins add vitest           # tests through `rr test`
```

Each `rr plugins add` installs the plugin, records it in `run-run.config.mts` and scaffolds its config file, asking first. `--yes` takes the defaults without asking: use it from an agent or a script. `rr plugins remove <name>` undoes an add.

For oxlint and oxfmt instead of Biome, run `rr plugins add oxc` in place of `biome`, then narrow it to `oxc({ only: ["lint", "format"] })` in `run-run.config.mts`, so that `ts` keeps the type-check.

CI runs `rr check`, `pnpm test` and `rr pack`, so it needs `biome` (or `oxc`), `ts` and `tsdown`.

## Develop

```sh
rr check                # lint + format check, then type-check
rr jsc --fix            # auto-fix lint + format
rr pack                 # build to dist/
pnpm test               # tests
```

## Release

This package uses [Changesets](https://github.com/changesets/changesets). As a developer you only need to describe the change; the publish step is run by CI.

```sh
pnpm changeset            # describe a change, and commit it
pnpm changeset version    # bump versions + changelog (locally, when needed)
```

On every push to `main`, the release workflow opens a "chore: update versions" PR with the pending changesets, or publishes with `pnpm changeset publish` once that PR is merged. `prepublishOnly` runs `rr pack` automatically before publish. The workflow acts as vland-bot, not `GITHUB_TOKEN`, so CI runs on that PR: the repository needs the `VLAND_BOT_CLIENT_ID` variable and the `VLAND_BOT_PRIVATE_KEY` secret.

CI publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so there is no `NPM_TOKEN` secret. Packages marked `"private": true` are never published. One-time setup for a public package:

1. Set `repository.url` in `package.json` to this GitHub repository. npm rejects the publish if it doesn't match exactly.
2. Publish the first version from your machine (`pnpm publish --access public`), because a trusted publisher can only be added to a package that already exists.
3. Trust this repository's release workflow: `npm trust github <package> --repo <owner>/<repo> --file release.yml --allow-publish`, or the "Trusted Publisher" section of the package settings on npmjs.com.
