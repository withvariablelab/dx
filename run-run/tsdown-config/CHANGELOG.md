# @rrlab/tsdown-config

## 0.2.0

### Minor Changes

- [#272](https://github.com/withvariablelab/dx/pull/272) [`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef) Thanks [@rqbazan](https://github.com/rqbazan)! - Require Node.js 22.18.0 or newer (`engines.node` was `>=20.0.0`).
  
  `rr` loads `run-run.config.{ts,mts}` with Node's native type stripping, which is on by default only from Node 22.18.0. Without it `rr` stops with `ERR_UNKNOWN_FILE_EXTENSION` as soon as it reads the config: Node 20 has no type stripping at all, and 22.6 to 22.17 only behind `--experimental-strip-types`. So the old `>=20.0.0` was never true for `rr`. CI now tests 22.18.0 and Node 24.

## 0.1.2

### Patch Changes

- [#259](https://github.com/withvariablelab/dx/pull/259) [`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b) Thanks [@rqbazan](https://github.com/rqbazan)! - Set the author to `rcrd <ricardo@variable.land>`.

## 0.1.1

### Patch Changes

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Republish from the `withvariablelab/dx` repository: `repository`, `homepage`
  and `bugs` now point at `withvariablelab/dx`, and packages that depended on
  `@vlandoss/clibuddy` / `@vlandoss/loggy` now depend on the renamed
  `@variablelab/clibuddy` / `@variablelab/loggy`. No behavior changes.

## 0.1.0

### Minor Changes

- [#223](https://github.com/variableland/dx/pull/223) [`74ecc14`](https://github.com/variableland/dx/commit/74ecc142b64d1f98635ebfbad100be5f2e784617) Thanks [@rqbazan](https://github.com/rqbazan)! - Inaugural release of the four official `@rrlab/<tool>-plugin` packages (`biome-plugin`, `oxc-plugin`, `ts-plugin`, `tsdown-plugin`) and re-release of `@rrlab/tsdown-config`. Each ships with its `dist/` built — earlier attempts (`@rrlab/plugin-*@0.1.0`, `@rrlab/tsdown-config@0.0.1`) were unpublished from npm after they shipped without `dist/` and could not be imported.

  Each plugin exports `default = definePlugin(...)` and provides one or more `PluginCapabilities` consumed by `@rrlab/cli`:

  | Plugin                 | Capabilities                      |
  | ---------------------- | --------------------------------- |
  | `@rrlab/biome-plugin`  | `lint`, `format`, `jsc`           |
  | `@rrlab/oxc-plugin`    | `lint` (oxlint), `format` (oxfmt) |
  | `@rrlab/ts-plugin`     | `tsc`                             |
  | `@rrlab/tsdown-plugin` | `pack`                            |

  `@rrlab/tsdown-config` ships the `defineLibConfig` / `defineBinConfig` helpers that `tsdown-plugin` scaffolds into a host project's `tsdown.config.ts`.

  Naming-convention decision recorded in `decisions/006-plugin-package-naming.md`: the entire `@rrlab/*` scope now follows `<tool>-<role>` (`biome-config` + `biome-plugin`, `ts-config` + `ts-plugin`, `tsdown-config` + `tsdown-plugin`) instead of mixing `<role>-<tool>` for plugins. `@rrlab/biome-config` and `@rrlab/ts-config` get a patch bump for the corresponding description update.

  ### `@rrlab/cli` fixes

  - `rr plugins add` now passes `silent: true` to the rollback `nypm.removeDependency` call that runs when a plugin's dynamic import fails. `rr plugins remove` does the same in its per-dep removal loop. Previously the package manager's stdout (e.g. pnpm's `Packages: -3`, the `Ignored build scripts` warning) leaked into the CLI's output after the surrounding spinner had finished.
  - Every package that has a build step (`tsdown`) now declares `prepublishOnly: "pnpm build"`, so a future `pnpm publish` that forgets to build first will fail loudly instead of shipping a tarball without `dist/`.
