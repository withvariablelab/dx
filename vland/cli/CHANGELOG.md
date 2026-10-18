# @variablelab/vland

## 0.4.0

### Minor Changes

- [#272](https://github.com/withvariablelab/dx/pull/272) [`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef) Thanks [@rqbazan](https://github.com/rqbazan)! - Require Node.js 22.18.0 or newer (`engines.node` was `>=20.0.0`).
  
  `rr` loads `run-run.config.{ts,mts}` with Node's native type stripping, which is on by default only from Node 22.18.0. Without it `rr` stops with `ERR_UNKNOWN_FILE_EXTENSION` as soon as it reads the config: Node 20 has no type stripping at all, and 22.6 to 22.17 only behind `--experimental-strip-types`. So the old `>=20.0.0` was never true for `rr`. CI now tests 22.18.0 and Node 24.

### Patch Changes

- Updated dependencies [[`3e70f16`](https://github.com/withvariablelab/dx/commit/3e70f16a1f822e9e3648c1a50ed3cc80a915a9ef)]:
  - @variablelab/clibuddy@0.8.0
  - @variablelab/loggy@0.3.0

## 0.3.7

### Patch Changes

- [#264](https://github.com/withvariablelab/dx/pull/264) [`ef63da1`](https://github.com/withvariablelab/dx/commit/ef63da113d1aaa0d79df35811db7f392ec485097) Thanks [@rqbazan](https://github.com/rqbazan)! - Guard the shell completion rc lines shown by the README and `vland completion --help` with `command -v vland` and discard their stderr, so a shell without `vland`, or with only a mise shim for it, starts without errors.

## 0.3.6

### Patch Changes

- Updated dependencies [[`8f31404`](https://github.com/withvariablelab/dx/commit/8f31404722456c65fc432652e8bae13f0633a98b)]:
  - @variablelab/clibuddy@0.7.4
  - @variablelab/loggy@0.2.3

## 0.3.5

### Patch Changes

- [#256](https://github.com/withvariablelab/dx/pull/256) [`df7a83a`](https://github.com/withvariablelab/dx/commit/df7a83abc60c38a0917c5f6cf2e0d3825abcace3) Thanks [@rqbazan](https://github.com/rqbazan)! - Put the Sign and the Tagline at the top of the README, and set the author to `rcrd <ricardo@variable.land>`.

## 0.3.4

### Patch Changes

- Updated dependencies [[`3b95217`](https://github.com/withvariablelab/dx/commit/3b95217c49dd32b366516085dfd5d3096d4b30fe)]:
  - @variablelab/clibuddy@0.7.3

## 0.3.3

### Patch Changes

- [#248](https://github.com/withvariablelab/dx/pull/248) [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e) Thanks [@rqbazan](https://github.com/rqbazan)! - Renamed from `@vlandoss/vland`. The CLI moved to the `withvariablelab/dx`
  repository and is now published as `@variablelab/vland` (the `vland` binary is
  unchanged). `vland init -t library` with public visibility (the default) now
  scaffolds `@variablelab/<name>` instead of `@vlandoss/<name>`, and templates are
  downloaded from `github:withvariablelab/dx`.
- Updated dependencies [[`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e), [`e02f589`](https://github.com/withvariablelab/dx/commit/e02f589351c8335f678c5d4ac2e9dcdfe3db187e)]:
  - @variablelab/clibuddy@0.7.2
  - @variablelab/loggy@0.2.2

## 0.3.2

### Patch Changes

- [#235](https://github.com/variableland/dx/pull/235) [`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50) Thanks [@rqbazan](https://github.com/rqbazan)! - Drop the `muted` token from `palette` and route its callers through `palette.dim`.

  `muted` (a fixed `#a8afb5` gray) overlapped with `dim` for the secondary-text role it was used in (`$` command prefix, `v<version>`, the `vland init` "Next steps" / source path). Consolidating on `dim` keeps a single secondary tone and lets it follow the terminal's dim attribute. `@vlandoss/vland`'s banner, `--usage` hint, and `init` output move to `dim` accordingly.

- Updated dependencies [[`c82191d`](https://github.com/variableland/dx/commit/c82191d8b450eaf551c5c488858193a385a48a50)]:
  - @vlandoss/clibuddy@0.7.1

## 0.3.1

### Patch Changes

- Updated dependencies [[`5476fe9`](https://github.com/variableland/dx/commit/5476fe970d139f7b386786c4f5fb23c7464bca93)]:
  - @vlandoss/clibuddy@0.7.0

## 0.3.0

### Minor Changes

- [#220](https://github.com/variableland/dx/pull/220) [`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c) Thanks [@rqbazan](https://github.com/rqbazan)! - Templates and `vland init` overhauled to align with the `@rrlab/*` ecosystem:

  - Every template now ships `@rrlab/cli` as the single CLI entry point and an empty `run-run.config.mts` (`plugins: []`). Per-tool config files (`biome.json`, `tsconfig.json`, `tsdown.config.ts`) and their devDeps are no longer bundled — run `rr plugins add biome | ts | tsdown` in the new project to opt in. Tool-related `package.json` scripts (`lint`, `format`, `test:types`, `check`, `build`) are removed — `rr` is meant to be typed directly in the terminal (the templates' `mise.toml` puts `./node_modules/.bin` on `PATH`). Lefthook + CI workflows + `prepublishOnly` call `pnpm rr <cmd>` directly.
  - New `--visibility <private|public>` flag (interactive prompt for the library template). Library scope derives from visibility: private → `@variableland/<name>` + `private: true`; public → `@vlandoss/<name>`.
  - Monorepo apps now use the bare `<projectName>-<app>` naming convention (`yoppy-api`, `yoppy-web`); packages stay scoped (`@yoppy/types`). Backend templates set `private: true` at root.
  - Removed the `--pm` flag and package-manager auto-detection — `vland` is opinionated and uses pnpm exclusively.
  - Library `release` npm-script removed (the developer never runs `pnpm release`; CI invokes `pnpm changeset publish` directly).

### Patch Changes

- [#220](https://github.com/variableland/dx/pull/220) [`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c) Thanks [@rqbazan](https://github.com/rqbazan)! - Relocate the `@vlandoss/*` stack inside the monorepo: `packages/{clibuddy,loggy}` → `shared/{clibuddy,loggy}`, and `packages/vland` + the three `vland init` scaffolds → `vland/{cli,templates}`. Package APIs are unchanged.

  The `vland init` template source moves with the scaffolds: when no `VLAND_TEMPLATES_DIR` override is set, `giget` now pulls from `github:variableland/dx/vland/templates/<name>` (previously `github:variableland/dx/templates/<name>`). Existing `vland init` invocations against the published CLI keep working once this version ships alongside the relocated `main` branch.

  `@vlandoss/clibuddy` and `@vlandoss/loggy` only see metadata updates (`homepage`, `repository.directory` repointed to `shared/<name>`); the published code is byte-identical to the previous patch.

- Updated dependencies [[`911965a`](https://github.com/variableland/dx/commit/911965a7b458b6de7197d8203a54e819786b396c)]:
  - @vlandoss/clibuddy@0.6.1
  - @vlandoss/loggy@0.2.1

## 0.2.0

### Minor Changes

- [#210](https://github.com/variableland/dx/pull/210) [`7d7e673`](https://github.com/variableland/dx/commit/7d7e673e34974740b6b09c8385e9f91ad9af8ea8) Thanks [@rqbazan](https://github.com/rqbazan)! - `vland init` now prompts (default-yes) for installing dependencies and initialising a git repository when those flags aren't passed on the CLI. Use `--install` / `--no-install` and `--git` / `--no-git` to skip the prompts; in non-interactive contexts both default to `true`.

  Also fixes the git initialisation step: the commit message was being split on whitespace by the underlying shell layer, producing errors like `pathspec 'initial' did not match any file(s)` and leaving the repo half-initialised. The migration to `tinyexec` (via `@vlandoss/clibuddy`) makes each argv entry survive as a separate token, so the canonical first commit `chore: initial commit from vland` now lands cleanly.

### Patch Changes

- Updated dependencies [[`7d7e673`](https://github.com/variableland/dx/commit/7d7e673e34974740b6b09c8385e9f91ad9af8ea8)]:
  - @vlandoss/clibuddy@0.6.0

## 0.1.1

### Patch Changes

- [#204](https://github.com/variableland/dx/pull/204) [`75e5b1c`](https://github.com/variableland/dx/commit/75e5b1c1834719d46d5c78f8c94a32636e7097a8) Thanks [@rqbazan](https://github.com/rqbazan)! - Show the vland banner at the start of the `init` command

## 0.1.0

### Minor Changes

- [#198](https://github.com/variableland/dx/pull/198) [`d467f7f`](https://github.com/variableland/dx/commit/d467f7fd0f0512a1fe15f6d74cd9a540a21bbfbc) Thanks [@rqbazan](https://github.com/rqbazan)! - Initial release of `@vlandoss/vland` — the modern project bootstrapper that replaces `@vlandoss/starter`.

  - Same `vland` binary and UX (ASCII banner, `--usage` → KDL, ghost `completion` command via the bash bin dispatcher).
  - New `vland init [name] [-t <template>]` flow built on **giget + @clack/prompts + commander**, with placeholder replacement (`{{projectName}}` / `{{author}}` / `{{year}}`), automatic dependency install via `nypm`, and `git init` through clibuddy's `ShellService`.
  - Three official templates fetched from `github:variableland/dx/templates/<name>` (with a `VLAND_TEMPLATES_DIR` escape hatch for E2E):
    - **`library`** — standalone publishable TypeScript library with Changesets release workflow.
    - **`backend`** — Elysia (`@elysiajs/node`) service with evlog, zod, Dockerfile, vitest integration test.
    - **`monorepo`** — pnpm + Turbo workspace with `apps/api` (Elysia + evlog), `apps/web` (Vite + React), `packages/types` (shared zod schemas).
  - All templates target Node.js 20+ (24 recommended), use pnpm 10.6.4, extend `@vlandoss/config` for biome and tsconfig, and include `@total-typescript/tsconfig` as a direct devDep so rolldown/vite can resolve the shared tsconfig under pnpm strict isolation.

### Patch Changes

- Updated dependencies [[`d467f7f`](https://github.com/variableland/dx/commit/d467f7fd0f0512a1fe15f6d74cd9a540a21bbfbc)]:
  - @vlandoss/clibuddy@0.5.0
