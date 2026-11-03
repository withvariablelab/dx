# biome-plugin

`@rrlab/biome-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [Biome](https://biomejs.dev). It gives `rr` the `lint`, `format` and `jscheck` capabilities.

## Install

```sh
rr plugins add biome
```

`rr plugins add` installs `@rrlab/biome-plugin` and adds `@biomejs/biome` as a dev dependency. Once you confirm, it writes a `biome.json` that extends [`@rrlab/biome-config`](https://www.npmjs.com/package/@rrlab/biome-config). If `biome.json` already exists, you choose to patch it, keep it or overwrite it. A patch adds the preset to `extends`, keeps your other settings, and formats the file with the installed Biome, so `rr jsc` passes on it.

It needs `@rrlab/cli` and Biome 2.6 or later.

## What it provides

| Capability | Commands                                             |
| ---------- | ---------------------------------------------------- |
| `lint`     | `rr lint`, `rr lint doctor`                          |
| `format`   | `rr format`, `rr format doctor`                      |
| `jscheck`  | `rr jsc` (lint and format together), `rr jsc doctor` |

## Configuration

The `biome.json` it writes only extends the preset:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@rrlab/biome-config"]
}
```

Any Biome setting in your `biome.json` overrides the preset. The preset lives in `@rrlab/biome-config`: update that package to get new defaults.

## Removal

```sh
rr plugins remove biome
```

It removes `@biomejs/biome` and `@rrlab/biome-config` from `package.json`, and edits or deletes `biome.json`, depending on whether it holds other settings. Then it drops `biome()` from `run-run.config.{ts,mts}`.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
