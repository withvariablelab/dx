# @rrlab/biome-config

## 0.0.7

### Patch Changes

- [#295](https://github.com/withvariablelab/dx/pull/295) [`9e360aa`](https://github.com/withvariablelab/dx/commit/9e360aa82269fc087de97cf988a68cfd5401d882) Thanks [@rqbazan](https://github.com/rqbazan)! - The `@biomejs/biome` peer range starts at `>=2.3.0`, since Biome 2.0 to 2.2 stop on the preset's `css.parser.tailwindDirectives` with "Found an unknown key `tailwindDirectives`".

## 0.0.6

### Patch Changes

- [#293](https://github.com/withvariablelab/dx/pull/293) [`cbc4727`](https://github.com/withvariablelab/dx/commit/cbc4727ee0b65c7a0cf0f64c055fc3a33714258a) Thanks [@rqbazan](https://github.com/rqbazan)! - The preset no longer sets `$schema` or `linter.rules.recommended`, so Biome 2.6 stops printing a schema-version notice and a deprecation notice on every run, with the same rules on as before.

## 0.0.5

### Patch Changes

- [#278](https://github.com/withvariablelab/dx/pull/278) [`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00) Thanks [@rqbazan](https://github.com/rqbazan)! - The README follows the Variable Lab README structure, and the tarball now includes the MIT `LICENSE`.

## 0.0.4

### Patch Changes

- [#259](https://github.com/withvariablelab/dx/pull/259) [`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b) Thanks [@rqbazan](https://github.com/rqbazan)! - Set the author to `rcrd <ricardo@variable.land>`.

## 0.0.3

### Patch Changes

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Republish from the `withvariablelab/dx` repository: `repository`, `homepage`
  and `bugs` now point at `withvariablelab/dx`, and packages that depended on
  `@vlandoss/clibuddy` / `@vlandoss/loggy` now depend on the renamed
  `@variablelab/clibuddy` / `@variablelab/loggy`. No behavior changes.

## 0.0.2

### Patch Changes

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

## 0.0.1

### Patch Changes

- [#220](https://github.com/variableland/dx/pull/220) [`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c) Thanks [@rqbazan](https://github.com/rqbazan)! - Inaugural release of the `@rrlab/*` ecosystem: a microkernel `rr` CLI plus four official, opt-in plugins (one per tool) and three shared config presets. Replaces the private `@vlandoss/run-run@0.x`. Architectural rationale lives in `decisions/001-005-*.md`.

  ## Kernel — `@rrlab/cli`

  `rr` is a thin command router. Built-ins: `lint`, `format`, `jsc`, `tsc`, `pack`, `check`, `doctor`, `clean`, `config`, `completion`, plus the `plugins` lifecycle (`add | remove | list`). Each plugin-backed command consults a `PluginRegistry` populated from `run-run.config.{ts,mts}`; a command with no provider exits with an actionable `rr plugins add <alias>` suggestion. `rr check` dispatches in-process via commander (no re-spawned `rr`). `rr jsc` is synthesised from `lint` + `format` when no plugin provides it directly.

  Public surface:

  - **`@rrlab/cli/config`** — `defineConfig` for user configs.
  - **`@rrlab/cli/plugin`** — the plugin contract: `Plugin`, `PluginContext`, `PluginCapabilities`, `PluginRegistry`, verb-matches-type capability shapes (`Linter.lint`, `Formatter.format`, `StaticChecker.check`, `TypeChecker.check`, `Packer.pack`), `Doctor`, the `install`/`uninstall` planner types (`InstallContext`, `FileOp`, `JsonEdit`), and `ToolService` as a base for tool wrappers. Treated as **internal to `@rrlab/*`** — the four official plugins are the only consumers we commit to.

  ## Plugins

  Four official plugins, each declaring its tool as a `peerDependency` ([D-001](../decisions/001-all-peer-dependencies.md)) and shipping without `bin` shims ([D-002](../decisions/002-no-bin-shims.md)). Each plugin owns the version ranges of its tool in `src/tool-versions.ts` (`TOOL_VERSIONS = { <tool>: { install, peer } }`) with a per-plugin coherence test that reads the plugin's `package.json` and asserts the peer range matches — the kernel stays tool-agnostic.

  | Plugin                     | Capabilities                      | Notes                                                                  |
  | -------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
  | **`@rrlab/plugin-biome`**  | `lint`, `format`, `jsc`           | One `BiomeService` backs all three.                                    |
  | **`@rrlab/plugin-oxc`**    | `lint` (oxlint), `format` (oxfmt) | `rr jsc` is composed by the kernel.                                    |
  | **`@rrlab/plugin-ts`**     | `tsc`                             | Workspace-aware via the optional `{ cwd }` arg on `TypeChecker.check`. |
  | **`@rrlab/plugin-tsdown`** | `pack`                            | —                                                                      |

  ## Lifecycle: `rr plugins add | remove`

  `rr plugins add <alias>` installs the plugin, edits `run-run.config.{ts,mts}` via `ConfigAstService` (magicast-based, preserves comments + unrelated keys), then runs the plugin's `install(ctx)` hook. The hook returns a declarative plan — `{ devDependencies, files: FileOp[] }` — that the kernel applies. `--yes` skips prompts; `--dry-run` prints the plan and exits. `rr plugins remove` is symmetric.

  `FileOp` ([D-004](../decisions/004-templating-and-edit-json-dsl.md)) is four ops:

  - **`create`** — full content as a string, no template engine.
  - **`edit-json`** — JSON Pointer paths + an idempotent op DSL (`set` / `unset` / `include` / `exclude`, with `set` modes `replace` / `if-missing`) via `comment-json`.
  - **`edit-text`** — escape hatch for TS modules (the plugin owns the parse, typically via `magicast`).
  - **`delete`** — idempotent.

  Plugin install/uninstall hooks are pure planners; the kernel does the IO. Package manager detection uses `nypm`: when `appPkg` is a monorepo root, `pnpm` gets `--workspace-root` and yarn-classic gets `-W` automatically.

  `rr doctor` walks every configured plugin and runs each `Doctor` once, dedup'd by service identity.

  ## Shared config presets

  - **`@rrlab/ts-config`** — five tsconfig presets `react | dom/app | dom/lib | no-dom/app | no-dom/lib`. `plugin-ts` scaffolds `tsconfig.json` as a one-line `{ "extends": "@rrlab/ts-config/<preset>" }` wrapper.
  - **`@rrlab/biome-config`** — shared biome preset; `plugin-biome` scaffolds `biome.json` to extend it.
  - **`@rrlab/tsdown-config`** — `defineLibConfig` / `defineBinConfig` helpers. `plugin-tsdown` scaffolds `tsdown.config.ts` as a thin call site ([D-005](../decisions/005-plugin-tsdown-scaffolding.md)).

  When the artifact already exists, `install()` patches in place: JSON files via `edit-json` (comment-preserving), `tsdown.config.ts` via `edit-text` + `magicast` (refuses to mutate an unrecognised default export — better to bail than guess). `uninstall()` is symmetric.

  ## Dogfood

  The monorepo runs on the new model. Root `run-run.config.mts` declares `plugins: [biome(), ts(), tsdown()]`; every workspace package is built via `@rrlab/tsdown-config` helpers.
