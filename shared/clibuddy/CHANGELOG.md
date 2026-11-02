# @variablelab/clibuddy

## 0.8.2

### Patch Changes

- [#281](https://github.com/withvariablelab/dx/pull/281) [`301bfe5`](https://github.com/withvariablelab/dx/commit/301bfe5202550431cc9e725f8efe703ab7e57fb8) Thanks [@rqbazan](https://github.com/rqbazan)! - The npm description, and the README where it changed, say what the code does.

## 0.8.1

### Patch Changes

- [#278](https://github.com/withvariablelab/dx/pull/278) [`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00) Thanks [@rqbazan](https://github.com/rqbazan)! - The README follows the Variable Lab README structure, and the tarball now includes the MIT `LICENSE`.

## 0.8.0

### Minor Changes

- [#272](https://github.com/withvariablelab/dx/pull/272) [`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef) Thanks [@rqbazan](https://github.com/rqbazan)! - Require Node.js 22.18.0 or newer (`engines.node` was `>=20.0.0`).
  
  `rr` loads `run-run.config.{ts,mts}` with Node's native type stripping, which is on by default only from Node 22.18.0. Without it `rr` stops with `ERR_UNKNOWN_FILE_EXTENSION` as soon as it reads the config: Node 20 has no type stripping at all, and 22.6 to 22.17 only behind `--experimental-strip-types`. So the old `>=20.0.0` was never true for `rr`. CI now tests 22.18.0 and Node 24.

## 0.7.4

### Patch Changes

- [#259](https://github.com/withvariablelab/dx/pull/259) [`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b) Thanks [@rqbazan](https://github.com/rqbazan)! - Set the author to `rcrd <ricardo@variable.land>`.

## 0.7.3

### Patch Changes

- [#252](https://github.com/withvariablelab/dx/pull/252) [`3b95217`](https://github.com/withvariablelab/dx/commit/3b95217c49dd32b366516085dfd5d3096d4b30fe) Thanks [@rqbazan](https://github.com/rqbazan)! - Treat `pnpm-workspace.yaml` as a workspace only when its `packages` array lists something other than the root.

  Since pnpm 10, single-package repos use `pnpm-workspace.yaml` for settings such as `minimumReleaseAge` or `catalog`, with no `packages` or with only the root (`packages: ["."]`). `Pkg.isMonorepo()` no longer reports such a repo as a monorepo, and `getWorkspaceProjects()` falls back to `package.json` workspaces instead of throwing `Invalid workspace patterns`. In those repos `rr tsc` (and so `rr check`) typechecks the root package instead of failing or skipping it, and `rr plugins add`/`remove` target the current package instead of the workspace root.

## 0.7.2

### Patch Changes

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Renamed from `@vlandoss/clibuddy`. The package moved to the `withvariablelab/dx`
  repository and is now published as `@variablelab/clibuddy`; the API is
  unchanged. Replace `@vlandoss/clibuddy` with `@variablelab/clibuddy` in your
  `package.json` and imports.

## 0.7.1

### Patch Changes

- [#235](https://github.com/variableland/dx/pull/235) [`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50) Thanks [@rqbazan](https://github.com/rqbazan)! - Drop the `muted` token from `palette` and route its callers through `palette.dim`.

  `muted` (a fixed `#a8afb5` gray) overlapped with `dim` for the secondary-text role it was used in (`$` command prefix, `v<version>`, the `vland init` "Next steps" / source path). Consolidating on `dim` keeps a single secondary tone and lets it follow the terminal's dim attribute. `@vlandoss/vland`'s banner, `--usage` hint, and `init` output move to `dim` accordingly.

## 0.7.0

### Minor Changes

- [#232](https://github.com/variableland/dx/pull/232) [`5476fe9`](https://github.com/variableland/dx/commit/5476fe970d139f7b386786c4f5fb23c7464bca93) Thanks [@rqbazan](https://github.com/rqbazan)! - Add `runTaskBoard`: a TTY-aware parallel task board. It runs N labelled tasks concurrently and renders one live spinner row each — collapsing to ✔/✖ with a duration — then flushes their captured output (dimmed on pass, full brightness on fail, capped with a `+N more lines` note) and a one-line summary. Non-TTY/CI prints each row once in input order, so logs stay deterministic. The `┌ │ └` frame is opt-in via `frame: true` (to divide composed sections); otherwise a lone task renders compactly and a multi-row run as a plain title + rows + summary. Glyphs mirror `@clack/prompts` (the `◒◐◓◑` spinner and gray `│ ┌ └` gutter). Also adds `palette.error`.

## 0.6.1

### Patch Changes

- [#220](https://github.com/variableland/dx/pull/220) [`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c) Thanks [@rqbazan](https://github.com/rqbazan)! - Relocate the `@vlandoss/*` stack inside the monorepo: `packages/{clibuddy,loggy}` → `shared/{clibuddy,loggy}`, and `packages/vland` + the three `vland init` scaffolds → `vland/{cli,templates}`. Package APIs are unchanged.

  The `vland init` template source moves with the scaffolds: when no `VLAND_TEMPLATES_DIR` override is set, `giget` now pulls from `github:variableland/dx/vland/templates/<name>` (previously `github:variableland/dx/templates/<name>`). Existing `vland init` invocations against the published CLI keep working once this version ships alongside the relocated `main` branch.

  `@vlandoss/clibuddy` and `@vlandoss/loggy` only see metadata updates (`homepage`, `repository.directory` repointed to `shared/<name>`); the published code is byte-identical to the previous patch.

## 0.6.0

### Minor Changes

- [#210](https://github.com/variableland/dx/pull/210) [`7d7e673`](https://github.com/variableland/dx/commit/7d7e673e34974740b6b09c8385e9f91ad9af8ea8) Thanks [@rqbazan](https://github.com/rqbazan)! - **Breaking:** Replace `zx` with `tinyexec` and redesign `ShellService` around array-based exec.

  The previous tagged-template API (`shell.$\`...\``) and its surrounding helpers (`quote`, `isRaw`, `defaultQuote`, `getPreferLocal`, `localBaseBinPath`, `mute()`, `quiet()`, `isProcessOutput`, `./test-helpers`export) are gone. They duplicated zx internals, introduced a quoting bug for whitespace strings, and surfaced inconsistent`node_modules/.bin` resolution.

  New surface:

  - `shell.run(cmd, args, opts?)` — streams stdio to the terminal and prints `$ <cmd> <args>` in verbose mode. Throws `NonZeroExitError` on non-zero exit by default.
  - `shell.runCaptured(cmd, args, opts?)` — silent, returns the captured `Output { stdout, stderr, exitCode }`. Same throw-by-default semantics.
  - `shell.at(cwd)` / `shell.child(opts)` — child shells with merged options.
  - `RunOptions`: `cwd`, `env`, `verbose`, `throwOnError`, `shell` (pass-through `shell: true` for `&&`/pipes), `stdin`, `display` (override the verbose-printed name without affecting what's spawned).
  - `resolvePackageBin(pkg, { from, binName? })` — async resolver that returns the absolute path to an installed package's binary, tolerating restrictive `exports` maps (oxlint) and packages without `main`/`exports` at all (`@biomejs/biome`). Memoised per `(pkg, from, binName)`.
  - `isNonZeroExitError(value)` — replaces `isProcessOutput`.

  `tinyexec` automatically prepends every parent `node_modules/.bin` to `PATH`, so `localBaseBinPath` / `getPreferLocal` are no longer needed.

  New dependencies: `tinyexec` (replaces `zx`), `memoize` (for `resolvePackageBin`).

  **Migration**

  - `await shell.$\`git init\``→`await shell.run("git", ["init"])`
  - `await shell.$\`git config\`.nothrow()`→`await shell.runCaptured("git", ["config", ...], { throwOnError: false })`
  - `shell.mute()` → call `runCaptured` instead (silent by default).
  - `createShellService({ localBaseBinPath: [dir] })` → drop the option; tinyexec walks up automatically.
  - `isProcessOutput(err)` → `isNonZeroExitError(err)`.
  - Tools wrapping a npm package (e.g. biome, tsdown) should resolve the bin path via `resolvePackageBin` and pass it as the `cmd` with `display: "<friendly-name>"` to avoid `node_modules/.bin/<name>` shim loops.

## 0.5.0

### Minor Changes

- [#198](https://github.com/variableland/dx/pull/198) [`d467f7f`](https://github.com/variableland/dx/commit/d467f7fd0f0512a1fe15f6d74cd9a540a21bbfbc) Thanks [@rqbazan](https://github.com/rqbazan)! - Modernise the CLI toolkit. **Breaking** for consumers — even though we stay on `0.x`, the public API names changed.

  **Colors**

  - Replace `chalk` + `supports-color` with [`ansis`](https://www.npmjs.com/package/ansis). `colorize(hex)` and `colorIsSupported()` keep their signatures.
  - Extend `palette` with semantic tokens used across our CLIs: `dim`, `highlight` (cyan), `success` (green), `label` (bgMagenta + black). `palette.bold` / `.italic` / `.link` / `.muted` / `.primary` are unchanged.

  **Package JSON helpers**

  - Replace `read-package-up` with [`pkg-types`](https://www.npmjs.com/package/pkg-types).
  - Rename `PkgService` → `Pkg` and `createPkgService` → `createPkg`.
  - Add `Pkg.write(packageJson)` for safely round-tripping `package.json` and `Pkg.pkgPath` getter.

  **Workspace discovery**

  - Replace `@pnpm/workspace.find-packages` + `@pnpm/workspace.read-manifest` with `@pnpm/fs.find-packages` + `yaml` (smaller dep tree, no `read-package-up` chain).

  **Env detection**

  - New `env` module re-exporting `hasTTY` and `isCI` from [`std-env`](https://www.npmjs.com/package/std-env). Replaces ad-hoc `process.env.NO_COLOR` / `is-ci` usage in consumers.

  **Internals**

  - Flatten `src/services/*` into `src/` (`pkg.ts`, `shell/*` directly under `src/`). The barrel still re-exports the same names.

  Migration: `import { createPkgService, type NormalizedPackageJson } from "@vlandoss/clibuddy"` → `import { createPkg, type PackageJson } from "@vlandoss/clibuddy"`. The chained chalk style (`chalk.bold.red`) maps 1:1 to ansis (`ansis.bold.red`); within clibuddy you should use `palette.*` tokens or call `colorize(hex)`.

## 0.4.0

### Minor Changes

- [#192](https://github.com/variableland/dx/pull/192) [`45e1b91`](https://github.com/variableland/dx/commit/45e1b9104d777f3a3da84f395ea62bdf8a2c5f58) Thanks [@rqbazan](https://github.com/rqbazan)! - Add UI consistency for CLIs

## 0.3.0

### Minor Changes

- [#182](https://github.com/variableland/dx/pull/182) [`0742fa4`](https://github.com/variableland/dx/commit/0742fa466d07a6df296fee9a575a9c92f7587c9c) Thanks [@rqbazan](https://github.com/rqbazan)! - feat(clibuddy): add `dirnameOf` / `filenameOf` helpers; simplify CLI bin entries

  - **New helpers in `@vlandoss/clibuddy`**: `dirnameOf(import.meta)` and `filenameOf(import.meta)`. They prefer the native `import.meta.dirname` / `import.meta.filename` (Node 20.11+) and fall back to `dirname(fileURLToPath(import.meta.url))` otherwise — so packages can keep `engines.node` at `>=20.0.0` without losing ergonomics.
  - **CLI bin entries simplified.** `bin.mjs` / `bin.ts` no longer compute `binDir` and pass it through a `main()` function — they just `import "./src/run.ts"` (or `./dist/run.mjs` for the published artifact). The new `src/run.ts` is now the executable entry: it resolves its own `BIN_DIR` via `dirnameOf(import.meta)` and starts the program. Affects `run-run`, `localproxy`, and `starter`. The `bin` field in each `package.json` is unchanged, so nothing changes for consumers running the CLIs.

## 0.2.0

### Minor Changes

- [#178](https://github.com/variableland/dx/pull/178) [`37eb596`](https://github.com/variableland/dx/commit/37eb596a3d50f30430f573ffe3c5a77a3aa88322) Thanks [@rqbazan](https://github.com/rqbazan)! - feat(run-run): add `doctor` subcommand to all tool-backed commands

  Each command that wraps an external tool (`jsc`, `tsc`, `lint`, `format`, `build:lib`) now exposes a `doctor` subcommand that verifies the underlying tool is available and working correctly. Example: `rr jsc doctor`.

  - Adds `ToolService` base class with a `doctor()` method that runs `<bin> --help` and returns `{ ok, output }`
  - Adds `TscService` to wrap the `tsc` binary via `ToolService`
  - Adds `createDoctorSubcommand` helper used by all five commands
  - Fixes `ToolService.#shell()` to not override the parent shell's `cwd` when no explicit cwd is given
  - Fixes `ToolService.#getPreferLocal()` to catch errors from `getBinDir()` gracefully

  feat(clibuddy): add `ShellService.mute()` method

  Adds a convenience `mute()` method to `ShellService` that combines `quiet()` (verbose: false) with `stdio: "pipe"`, used internally by the doctor flow to capture tool output without printing it.

  fix(localproxy): correct internal import path alias (`#/*` → `#src/*`)

## 0.1.1

### Patch Changes

- [#168](https://github.com/variableland/dx/pull/168) [`80e17f9`](https://github.com/variableland/dx/commit/80e17f9544f1cfff526f27ea50e2dacc6dba6e06) Thanks [@rqbazan](https://github.com/rqbazan)! - Migrate from Bun to Node.js as the runtime target.

  - `run-run`: fix `require.resolve` usage in `BiomeService` (not available in ESM with Node.js); replaced with `createRequire`. Add support for `run-run.config.mts` config files.
  - `localproxy`: replace `fs.exists` (Bun-only API) with a `fs.access`-based helper.
  - `clibuddy`, `loggy`, `starter`: remove `bun` from `engines` field.

## 0.1.0

### Minor Changes

- [#165](https://github.com/variableland/dx/pull/165) [`33659b4`](https://github.com/variableland/dx/commit/33659b4f2666aee939ed637b0dd6366854e22a96) Thanks [@rqbazan](https://github.com/rqbazan)! - Add Node.js compatibility via `publishConfig` and compiled output

  All publishable packages now ship compiled `dist/` output (via tsdown) and use `publishConfig.exports`/`publishConfig.bin` to override the package fields at publish time. This means consumers using Node.js no longer need Bun installed — the published packages work with `node >= 20` out of the box.

  A new shared package `@vlandoss/tsdown-config` provides reusable build presets (`defineBinConfig`, `defineLibConfig`) and the `nodeShebangPlugin` that rewrites the `#!/usr/bin/env bun` shebang to `#!/usr/bin/env node` in compiled bin files.

## 0.0.10

### Patch Changes

- [#162](https://github.com/variableland/dx/pull/162) [`5c89c36`](https://github.com/variableland/dx/commit/5c89c362934af0722e6b7788eb08b0620a97eb32) Thanks [@rqbazan](https://github.com/rqbazan)! - Switch tsconfigs to `@vlandoss/config/ts/*` and move path aliases from tsconfig `paths` to the `package.json` `imports` field (`#src/*`, `#test/*`). Relative imports now use explicit `.ts` extensions.

## 0.0.9

### Patch Changes

- [#154](https://github.com/variableland/dx/pull/154) [`577f4c7`](https://github.com/variableland/dx/commit/577f4c7df0f2f749fad395ec454d287f666d47bd) Thanks [@rqbazan](https://github.com/rqbazan)! - Improve fatal error logging

## 0.0.8

### Patch Changes

- [#149](https://github.com/variableland/dx/pull/149) [`6092149`](https://github.com/variableland/dx/commit/60921491f8d26159d450a5f41986fab220f40074) Thanks [@rqbazan](https://github.com/rqbazan)! - Change exported colors

- [#146](https://github.com/variableland/dx/pull/146) [`0ca5ac1`](https://github.com/variableland/dx/commit/0ca5ac1aba30399b4a3f7500e0156ab28bcf62d2) Thanks [@rqbazan](https://github.com/rqbazan)! - Upgrade deps

## 0.0.7

### Patch Changes

- [#144](https://github.com/variableland/dx/pull/144) [`c1517b2`](https://github.com/variableland/dx/commit/c1517b2e05d5a3bf7a067ec461c7d9e789f06a2f) Thanks [@rqbazan](https://github.com/rqbazan)! - Add test:types script

- [#142](https://github.com/variableland/dx/pull/142) [`b31758e`](https://github.com/variableland/dx/commit/b31758e2d2e2e97a5f3b7b3fec73939e8003da73) Thanks [@rqbazan](https://github.com/rqbazan)! - Stop using tsup

## 0.0.6

### Patch Changes

- [#140](https://github.com/variableland/dx/pull/140) [`97a4b51`](https://github.com/variableland/dx/commit/97a4b513617b39b49dbc5244c9c8d9011a721f6f) Thanks [@rqbazan](https://github.com/rqbazan)! - Export new colors for terminal ui

## 0.0.5

### Patch Changes

- [#117](https://github.com/variableland/dx/pull/117) [`3c05da4`](https://github.com/variableland/dx/commit/3c05da44e93bc66433cd222e1f1466a7e2048cec) Thanks [@rqbazan](https://github.com/rqbazan)! - Add bold style

## 0.0.4

### Patch Changes

- [#103](https://github.com/variableland/dx/pull/103) [`9557335`](https://github.com/variableland/dx/commit/95573357150d5de9c756b250748686e49ae5ced3) Thanks [@rqbazan](https://github.com/rqbazan)! - Export Shell type

## 0.0.3

### Patch Changes

- [#97](https://github.com/variableland/dx/pull/97) [`813cfcb`](https://github.com/variableland/dx/commit/813cfcb88e9f273b7f75cf2e2275904c25810130) Thanks [@rqbazan](https://github.com/rqbazan)! - Move to Biome v2

## 0.0.2

### Patch Changes

- [#95](https://github.com/variableland/dx/pull/95) [`0c198e4`](https://github.com/variableland/dx/commit/0c198e46f159edfad14f6b2337e41e05f97172bb) Thanks [@rqbazan](https://github.com/rqbazan)! - Add multi typecheck

- [#96](https://github.com/variableland/dx/pull/96) [`dc003be`](https://github.com/variableland/dx/commit/dc003bee8bfca1a50850b09114617ed030fcc6d7) Thanks [@rqbazan](https://github.com/rqbazan)! - Fix error display handling

## 0.0.1

### Patch Changes

- [#85](https://github.com/variableland/dx/pull/85) [`bdae9bf`](https://github.com/variableland/dx/commit/bdae9bf09a9a967ced98dd42b373c725c2c4f2b3) Thanks [@rqbazan](https://github.com/rqbazan)! - Move to @vlandoss organization
