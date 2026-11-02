# @rrlab/ts-plugin

## 1.2.2

### Patch Changes

- [#281](https://github.com/withvariablelab/dx/pull/281) [`301bfe5`](https://github.com/withvariablelab/dx/commit/301bfe5202550431cc9e725f8efe703ab7e57fb8) Thanks [@rqbazan](https://github.com/rqbazan)! - The npm description, and the README where it changed, say what the code does.
- Updated dependencies [[`301bfe5`](https://github.com/withvariablelab/dx/commit/301bfe5202550431cc9e725f8efe703ab7e57fb8)]:
  - @variablelab/clibuddy@0.8.2

## 1.2.1

### Patch Changes

- [#278](https://github.com/withvariablelab/dx/pull/278) [`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00) Thanks [@rqbazan](https://github.com/rqbazan)! - The README follows the Variable Lab README structure, and the tarball now includes the MIT `LICENSE`.
- Updated dependencies [[`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00)]:
  - @variablelab/clibuddy@0.8.1

## 1.2.0

### Minor Changes

- [#272](https://github.com/withvariablelab/dx/pull/272) [`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef) Thanks [@rqbazan](https://github.com/rqbazan)! - Require Node.js 22.18.0 or newer (`engines.node` was `>=20.0.0`).
  
  `rr` loads `run-run.config.{ts,mts}` with Node's native type stripping, which is on by default only from Node 22.18.0. Without it `rr` stops with `ERR_UNKNOWN_FILE_EXTENSION` as soon as it reads the config: Node 20 has no type stripping at all, and 22.6 to 22.17 only behind `--experimental-strip-types`. So the old `>=20.0.0` was never true for `rr`. CI now tests 22.18.0 and Node 24.

### Patch Changes

- [#276](https://github.com/withvariablelab/dx/pull/276) [`db8398e`](https://github.com/withvariablelab/dx/commit/db8398e99372b4a1bfab6a80d786321e17e49837) Thanks [@rqbazan](https://github.com/rqbazan)! - `rr plugins add ts` defaults to the React preset when the package depends on `react` (in `dependencies`, `devDependencies` or `peerDependencies`), and to the Node.js app preset otherwise. That's what `--yes` and a run without a terminal pick, and where the prompt starts. Before, they always picked the Node.js preset, which can't type-check a React app.
- Updated dependencies [[`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef)]:
  - @variablelab/clibuddy@0.8.0

## 1.1.4

### Patch Changes

- [#259](https://github.com/withvariablelab/dx/pull/259) [`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b) Thanks [@rqbazan](https://github.com/rqbazan)! - Set the author to `rcrd <ricardo@variable.land>`.

- Updated dependencies [[`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b)]:
  - @variablelab/clibuddy@0.7.4

## 1.1.3

### Patch Changes

- Updated dependencies [[`3b95217`](https://github.com/withvariablelab/dx/commit/3b95217c49dd32b366516085dfd5d3096d4b30fe)]:
  - @variablelab/clibuddy@0.7.3

## 1.1.2

### Patch Changes

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Republish from the `withvariablelab/dx` repository: `repository`, `homepage`
  and `bugs` now point at `withvariablelab/dx`, and packages that depended on
  `@vlandoss/clibuddy` / `@vlandoss/loggy` now depend on the renamed
  `@variablelab/clibuddy` / `@variablelab/loggy`. No behavior changes.
- Updated dependencies [[`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e)]:
  - @variablelab/clibuddy@0.7.2

## 1.1.1

### Patch Changes

- [#235](https://github.com/variableland/dx/pull/235) [`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50) Thanks [@rqbazan](https://github.com/rqbazan)! - Decouple the CLI into framework-agnostic layers and redesign the help surface.

  Every command body becomes a free-function action (`src/actions/*`) that takes a single `<Name>ActionConfig` object; commander commands are thin wrappers that resolve their service via the `ctx.plugins` facade (throwing `MissingPluginError` when no configured plugin provides the capability) and delegate to exactly one action. Actions depend only on `services`/`render`/`lib`, never on the CLI framework. The plugin SDK moves to `src/lib/plugin/*`, ad-hoc errors become domain error classes (`src/errors/*` for kernel errors, `src/lib/plugin/errors.ts` for SDK errors), and a plugin's `ui` label is now derived from a single `color` function it provides — plugins no longer hard-code their own `ui` string. The `plugins` command monolith is split into `actions/plugins/*`, and the official plugin list is reshaped into `src/lib/plugin/directory.ts` (`PLUGINS_DIRECTORY` + `allPluginNames`/`isPluginName`).

  The help surface is rebuilt on commander's native formatter instead of a bespoke help class: the root program is a `RunRunCmd` subclass that groups commands (`Code quality:` / `Build:` / `Maintenance:` / `Meta:`) and attaches a banner and an installed/available plugins footer via `addHelpText`. Unknown commands now use commander's native `showSuggestionAfterError` "Did you mean?" output. `--about` credits, per-command `Powered by:` / `See also:` lines (auto-derived from each command's declared capabilities by the `Cmd` base class in `src/program/base.ts`), the installed/available plugins footer (`render/footer.ts`), a `rr config` plugins table (package + version), and a small table/line builder (`render/lines.ts`) round out the rendering layer.

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

### Patch Changes

- [#229](https://github.com/variableland/dx/pull/229) [`696de73`](https://github.com/variableland/dx/commit/696de73e4f602b860586df413757274dabc1c198) Thanks [@rqbazan](https://github.com/rqbazan)! - `TOOL_VERSIONS` now carries only `install` (the prescriptive pin used by `rr plugins add`). The `peer` field is gone — `package.json#peerDependencies` is the single source of truth for the peer contract. The per-plugin `tool-versions.test.ts` asserts `semver.subset(install, peerDependencies[name])` instead of string-equality with a duplicated `peer` field. No runtime behaviour change — `peer` was never read outside its parity test.

  Architectural rationale: `decisions/010-tool-versions-install-only.md`.

- Updated dependencies [[`696de73`](https://github.com/variableland/dx/commit/696de73e4f602b860586df413757274dabc1c198)]:
  - @rrlab/cli@1.0.0

## 0.1.1

### Patch Changes

- [#226](https://github.com/variableland/dx/pull/226) [`76ebd6c`](https://github.com/variableland/dx/commit/76ebd6c94805768583668b5003f0c28d86829487) Thanks [@rqbazan](https://github.com/rqbazan)! - Stop hardcoding the `@rrlab/*-config` sibling version range in each plugin's install hook — the plugin and its config sibling are versioned independently and could drift (e.g. `@rrlab/biome-plugin@0.1.0` was pinning `@rrlab/biome-config@^0.1.0` while the latest published config was `0.0.2`, breaking `rr plugins add biome`).

  Plugins now resolve the sibling spec via the new `ctx.release: ReleaseService` on `InstallContext`. With no release tag, `ctx.release.resolve(pkg)` returns `"latest"`. When the user runs `rr plugins add biome@pr-226` (new syntax), the kernel parses the dist-tag, installs the plugin at that tag, and the install hook resolves siblings under the same tag — falling back to `"latest"` for any sibling the registry doesn't have at that tag (so partial preview releases install cleanly).

- Updated dependencies [[`76ebd6c`](https://github.com/variableland/dx/commit/76ebd6c94805768583668b5003f0c28d86829487)]:
  - @rrlab/cli@0.0.3

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

### Patch Changes

- Updated dependencies [[`74ecc14`](https://github.com/variableland/dx/commit/74ecc142b64d1f98635ebfbad100be5f2e784617)]:
  - @rrlab/cli@0.0.2
  - @vlandoss/clibuddy@0.6.1
