# @rrlab/cli

## 1.4.0

### Minor Changes

- [#272](https://github.com/withvariablelab/dx/pull/272) [`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef) Thanks [@rqbazan](https://github.com/rqbazan)! - Require Node.js 22.18.0 or newer (`engines.node` was `>=20.0.0`).
  
  `rr` loads `run-run.config.{ts,mts}` with Node's native type stripping, which is on by default only from Node 22.18.0. Without it `rr` stops with `ERR_UNKNOWN_FILE_EXTENSION` as soon as it reads the config: Node 20 has no type stripping at all, and 22.6 to 22.17 only behind `--experimental-strip-types`. So the old `>=20.0.0` was never true for `rr`. CI now tests 22.18.0 and Node 24.

### Patch Changes

- [#267](https://github.com/withvariablelab/dx/pull/267) [`bb67697`](https://github.com/withvariablelab/dx/commit/bb676975df8984f600700751f31edbb5267498d4) Thanks [@rqbazan](https://github.com/rqbazan)! - List `@rrlab/vitest-plugin` in the README's table of official plugins.
- Updated dependencies [[`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef)]:
  - @variablelab/clibuddy@0.8.0
  - @variablelab/loggy@0.3.0

## 1.3.5

### Patch Changes

- [#264](https://github.com/withvariablelab/dx/pull/264) [`ef63da1`](https://github.com/withvariablelab/dx/commit/ef63da113d1aaa0d79df35811db7f392ec485097) Thanks [@rqbazan](https://github.com/rqbazan)! - Discard stderr in the shell completion rc lines shown by the README and `rr completion --help`, so a mise shim for `rr` with no active version no longer prints `mise ERROR No version is set for shim: rr` on every new shell outside a project.

## 1.3.4

### Patch Changes

- Updated dependencies [[`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b)]:
  - @variablelab/clibuddy@0.7.4
  - @variablelab/loggy@0.2.3

## 1.3.3

### Patch Changes

- [#256](https://github.com/withvariablelab/dx/pull/256) [`df7a83a`](https://github.com/withvariablelab/dx/commit/df7a83abc60c38a0917c5f6cf2e0d3825abcace3) Thanks [@rqbazan](https://github.com/rqbazan)! - Put the Sign and the Tagline at the top of the README, and set the author to `rcrd <ricardo@variable.land>`.

## 1.3.2

### Patch Changes

- [#252](https://github.com/withvariablelab/dx/pull/252) [`3b95217`](https://github.com/withvariablelab/dx/commit/3b95217c49dd32b366516085dfd5d3096d4b30fe) Thanks [@rqbazan](https://github.com/rqbazan)! - Treat `pnpm-workspace.yaml` as a workspace only when its `packages` array lists something other than the root.

  Since pnpm 10, single-package repos use `pnpm-workspace.yaml` for settings such as `minimumReleaseAge` or `catalog`, with no `packages` or with only the root (`packages: ["."]`). `Pkg.isMonorepo()` no longer reports such a repo as a monorepo, and `getWorkspaceProjects()` falls back to `package.json` workspaces instead of throwing `Invalid workspace patterns`. In those repos `rr tsc` (and so `rr check`) typechecks the root package instead of failing or skipping it, and `rr plugins add`/`remove` target the current package instead of the workspace root.

- Updated dependencies [[`3b95217`](https://github.com/withvariablelab/dx/commit/3b95217c49dd32b366516085dfd5d3096d4b30fe)]:
  - @variablelab/clibuddy@0.7.3

## 1.3.1

### Patch Changes

- [#247](https://github.com/withvariablelab/dx/pull/247) [`ded9b58`](https://github.com/withvariablelab/dx/commit/ded9b58b52cd0a89842ec558853a14a1caa8fd5a) Thanks [@rqbazan](https://github.com/rqbazan)! - Render user-facing errors cleanly instead of dumping a raw Node stack trace.

  Domain errors (e.g. a missing plugin for the requested capability) now print
  just their message and exit 1, rather than the verbose
  `MissingPluginError: …` + `at …` + `Node.js v…` uncaught-exception wall.
  Unexpected errors still surface their full stack so genuine bugs stay
  debuggable. Domain errors extend a shared `KnownError` base, and a top-level
  handler in `run.ts` decides which treatment each gets.

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Republish from the `withvariablelab/dx` repository: `repository`, `homepage`
  and `bugs` now point at `withvariablelab/dx`, and packages that depended on
  `@vlandoss/clibuddy` / `@vlandoss/loggy` now depend on the renamed
  `@variablelab/clibuddy` / `@variablelab/loggy`. No behavior changes.
- Updated dependencies [[`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e), [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e)]:
  - @variablelab/clibuddy@0.7.2
  - @variablelab/loggy@0.2.2

## 1.3.0

### Minor Changes

- [#244](https://github.com/variableland/dx/pull/244) [`42a8eb0`](https://github.com/variableland/dx/commit/42a8eb0aa22edc43fc200ac3329527ec1019c3c3) Thanks [@rqbazan](https://github.com/rqbazan)! - Add `@rrlab/vitest-plugin` and the `rr test` command — a passthrough to vitest.

  `rr test` forwards every flag and argument (and `--help`) straight to vitest, and loads an env file first (the first existing of `.env.test`, then `.env`; override with `--env <path>`). This adds a streaming `test` capability to the kernel (`TestRunner`, `ToolService.runStreamed`) alongside the existing captured verbs.

## 1.2.1

### Patch Changes

- [#241](https://github.com/variableland/dx/pull/241) [`50bff97`](https://github.com/variableland/dx/commit/50bff97dc4b94398f2744ebb4f0e6b5e997ceb70) Thanks [@rqbazan](https://github.com/rqbazan)! - Honor `pretscheck` as the primary pre-script alias for `rr tsc`.

  Now that the typecheck task is canonically named `tscheck` (#240), a package's `pretscheck` script runs before the type check, taking precedence over the legacy `pretsc` and `pretypecheck` aliases (which still work as fallbacks).

## 1.2.0

### Minor Changes

- [#235](https://github.com/variableland/dx/pull/235) [`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50) Thanks [@rqbazan](https://github.com/rqbazan)! - Decouple the CLI into framework-agnostic layers and redesign the help surface.

  Every command body becomes a free-function action (`src/actions/*`) that takes a single `<Name>ActionConfig` object; commander commands are thin wrappers that resolve their service via the `ctx.plugins` facade (throwing `MissingPluginError` when no configured plugin provides the capability) and delegate to exactly one action. Actions depend only on `services`/`render`/`lib`, never on the CLI framework. The plugin SDK moves to `src/lib/plugin/*`, ad-hoc errors become domain error classes (`src/errors/*` for kernel errors, `src/lib/plugin/errors.ts` for SDK errors), and a plugin's `ui` label is now derived from a single `color` function it provides — plugins no longer hard-code their own `ui` string. The `plugins` command monolith is split into `actions/plugins/*`, and the official plugin list is reshaped into `src/lib/plugin/directory.ts` (`PLUGINS_DIRECTORY` + `allPluginNames`/`isPluginName`).

  The help surface is rebuilt on commander's native formatter instead of a bespoke help class: the root program is a `RunRunCmd` subclass that groups commands (`Code quality:` / `Build:` / `Maintenance:` / `Meta:`) and attaches a banner and an installed/available plugins footer via `addHelpText`. Unknown commands now use commander's native `showSuggestionAfterError` "Did you mean?" output. `--about` credits, per-command `Powered by:` / `See also:` lines (auto-derived from each command's declared capabilities by the `Cmd` base class in `src/program/base.ts`), the installed/available plugins footer (`render/footer.ts`), a `rr config` plugins table (package + version), and a small table/line builder (`render/lines.ts`) round out the rendering layer.

### Patch Changes

- [#237](https://github.com/variableland/dx/pull/237) [`b761f03`](https://github.com/variableland/dx/commit/b761f037024ec1e9aa09d8efff334409d9098839) Thanks [@rqbazan](https://github.com/rqbazan)! - Refresh the README for the microkernel model.

  Drop the stale, hand-maintained `Toolbox` section (it still listed `rimraf`, which isn't a plugin) and fold the tool list into the `Plugins` section as the single source of truth. The official plugins are now named there — `biome`, `oxc`, `ts`, `tsdown` — each linked to the tool it wraps, framed as capabilities added via plugins rather than a flat bag of tools.

- Updated dependencies [[`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50)]:
  - @vlandoss/clibuddy@0.7.1

## 1.1.0

### Minor Changes

- [#232](https://github.com/variableland/dx/pull/232) [`5476fe9`](https://github.com/variableland/dx/commit/5476fe970d139f7b386786c4f5fb23c7464bca93) Thanks [@rqbazan](https://github.com/rqbazan)! - Rework the output of `rr check`, `lint`, `format`, `jsc`, `tsc`, `pack`, and `doctor` into a live task board. Each tool runs captured and renders a spinner row that collapses to ✔/✖, with its output flushed below (dimmed on a pass, full brightness on a failure) and a one-line summary. In a monorepo, `tsc` shows one row per package so it's clear which one failed.

  Every command and subcommand now reads identically: a single-target row is `<command> (<tool>) · <package>` (e.g. `lint (biome) · dx`, `doctor (biome) · dx`), a fan-out is `<command> (<tool>) · <n> packages`, and each run shows the underlying `$ <command>` it executed. `rr check` runs `jsc` then `tsc` as framed sections and closes with one overall verdict (`✔ check passed` / `✖ check failed · <section>`). The verdict is always the tool's exit code — never parsed from output. `clean` stays logger-based (it has no pass/fail verdict).

  Plugin SDK: the capability verbs plus `Packer.pack()` and `Doctor.doctor()` now return a `RunReport` (`{ ok, output }`); `DoctorResult`/`DoctorOutput` are removed. See decisions 012–014.

### Patch Changes

- Updated dependencies [[`5476fe9`](https://github.com/variableland/dx/commit/5476fe970d139f7b386786c4f5fb23c7464bca93)]:
  - @vlandoss/clibuddy@0.7.0

## 1.0.0

### Major Changes

- [#229](https://github.com/variableland/dx/pull/229) [`696de73`](https://github.com/variableland/dx/commit/696de73e4f602b860586df413757274dabc1c198) Thanks [@rqbazan](https://github.com/rqbazan)! - ### Declarative plugin shape + first-class `only` narrowing

  Every official plugin factory now accepts an `only?: readonly Kind[]` option that narrows which capabilities the plugin contributes to the kernel's registry. The `only` array is typed against the kinds _that plugin_ provides — `biome({ only: ["lint", "format"] })` and `oxc({ only: ["tsc"] })` are both valid; `oxc({ only: ["pack"] })` is a compile error.

  This unblocks host configurations that mix plugins with overlapping capabilities — for example, biome for lint+format alongside oxc for type-aware checks:

  ```ts
  import biome from "@rrlab/biome-plugin";
  import oxc from "@rrlab/oxc-plugin";
  import { defineConfig } from "@rrlab/cli/config";

  export default defineConfig({
    plugins: [biome({ only: ["lint", "format"] }), oxc({ only: ["tsc"] })],
  });
  ```

  ### `@rrlab/oxc-plugin` — new `tsc` capability

  `@rrlab/oxc-plugin` now provides a `tsc` capability backed by the `oxlint-tsgolint` peer (already installed by `rr plugins add oxc`). `rr tsc` configured with the oxc plugin runs `oxlint --type-aware --type-check`.

  ### `@rrlab/cli` — better multi-provider error

  The error thrown when two plugins claim the same capability now references the `only` syntax explicitly, e.g.:

  > Multiple plugins provide capability 'lint': biome, oxc. Narrow each plugin's capabilities in run-run.config.ts using the 'only' option — e.g. biome({ only: ['lint'] }) or oxc({ only: ['lint'] }).

  ### Plugin authoring — declarative shape (internal-only)

  Plugins now declare `capabilities` (a `{ kind: service }` map) rather than implementing an imperative `setup()`. The kernel-internal SDK at `@rrlab/cli/plugin` applies `only` narrowing, deduplicates bin probes across services that share a `pkg`, and surfaces a single canonical "requires X to be installed" error when a peer-installed tool is missing. New plugin-authoring helpers `decideScaffold` and `pickPreset` are exported from `@rrlab/cli/plugin` and are the canonical path for any user interaction during `rr plugins add`.

  The plugin API remains internal to `@rrlab/*` (no third-party authoring contract). Architectural rationale recorded in `decisions/007-per-plugin-only-option.md` (superseded by 009) and `decisions/009-declarative-plugin-shape.md`.

## 0.0.3

### Patch Changes

- [#226](https://github.com/variableland/dx/pull/226) [`76ebd6c`](https://github.com/variableland/dx/commit/76ebd6c94805768583668b5003f0c28d86829487) Thanks [@rqbazan](https://github.com/rqbazan)! - Stop hardcoding the `@rrlab/*-config` sibling version range in each plugin's install hook — the plugin and its config sibling are versioned independently and could drift (e.g. `@rrlab/biome-plugin@0.1.0` was pinning `@rrlab/biome-config@^0.1.0` while the latest published config was `0.0.2`, breaking `rr plugins add biome`).

  Plugins now resolve the sibling spec via the new `ctx.release: ReleaseService` on `InstallContext`. With no release tag, `ctx.release.resolve(pkg)` returns `"latest"`. When the user runs `rr plugins add biome@pr-226` (new syntax), the kernel parses the dist-tag, installs the plugin at that tag, and the install hook resolves siblings under the same tag — falling back to `"latest"` for any sibling the registry doesn't have at that tag (so partial preview releases install cleanly).

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

- Updated dependencies []:
  - @vlandoss/clibuddy@0.6.1
  - @vlandoss/loggy@0.2.1

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

- Updated dependencies [[`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c)]:
  - @vlandoss/clibuddy@0.6.1
  - @vlandoss/loggy@0.2.1
