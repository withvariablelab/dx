# oxc-plugin

`@rrlab/oxc-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [oxc](https://oxc.rs). It gives `rr` the `lint` (oxlint), `format` (oxfmt) and `typecheck` (oxlint type-aware) capabilities.

## Install

```sh
rr plugins add oxc
```

`rr plugins add` installs `@rrlab/oxc-plugin` and adds `oxlint`, `oxfmt` and `oxlint-tsgolint` as dev dependencies. It writes no config file: oxlint and oxfmt run with their defaults, and a project that needs to change them adds its own `.oxlintrc.json` or `.oxfmtrc.json`.

It needs `@rrlab/cli`, oxlint 1.30 or later and oxfmt 0.67 or later. The type check also needs `oxlint-tsgolint` 0.24 or later, an optional peer.

## What it provides

| Capability  | Commands                        | Underlying command                 |
| ----------- | ------------------------------- | ---------------------------------- |
| `lint`      | `rr lint`, `rr lint doctor`     | `oxlint`, `oxlint --fix`           |
| `format`    | `rr format`, `rr format doctor` | `oxfmt --check`, `oxfmt --write`   |
| `typecheck` | `rr tsc`, `rr tsc doctor`       | `oxlint --type-aware --type-check` |

The type check runs through `oxlint-tsgolint`.

`rr jsc` runs lint and format together. When no plugin provides `jscheck`, `rr` composes it from the `lint` and `format` providers, so with oxc alone it runs oxlint and oxfmt.

## Picking only some capabilities

Pass `only` to mix oxc with another plugin, such as Biome for lint and format and oxc for the type-aware checks:

```ts
import biome from "@rrlab/biome-plugin";
import oxc from "@rrlab/oxc-plugin";
import { defineConfig } from "@rrlab/cli/config";

export default defineConfig({
  plugins: [
    biome({ only: ["lint", "format"] }),
    oxc({ only: ["typecheck"] }),
  ],
});
```

The `only` array is typed against the capabilities _this_ plugin provides (`"lint" | "format" | "typecheck"` for oxc), so a typo like `oxc({ only: ["pack"] })` fails at compile time.

## Removal

```sh
rr plugins remove oxc
```

It removes `oxlint`, `oxfmt` and `oxlint-tsgolint` from `package.json`, and drops `oxc()` from `run-run.config.{ts,mts}`. It leaves `.oxlintrc.json` and `.oxfmtrc.json` alone, if you have them: they belong to you.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
