# 005: How `@rrlab/plugin-tsdown` scaffolds and unscaffolds `tsdown.config.ts`

- **Date**: 2026-05-19
- **Amended**: 2026-11-03 — magicast 0.5 writes `import { x }` with inner spaces
- **Status**: Applied
- **Files affected**: `run-run/tsdown-config/` (renamed from `packages/tsdown-config`), `run-run/plugin-tsdown/src/index.ts`, `run-run/plugin-tsdown/src/__tests__/install.test.ts`, all in-repo consumers of the renamed package (root + 7 packages), `decisions/005-plugin-tsdown-scaffolding.md`.

## Context

`@rrlab/plugin-tsdown` only added a `tsdown` devDependency on install — no config file was scaffolded. We now want parity with `plugin-ts`: `rr plugins add tsdown` should drop a `tsdown.config.ts` that points at a shared preset package, and `rr plugins remove tsdown` should undo it. As part of the same change, `packages/tsdown-config` (`@vlandoss/tsdown-config`) moves to `run-run/tsdown-config` (`@rrlab/tsdown-config`) so the config companion lives next to the plugin it serves, matching `plugin-ts` ↔ `ts-config` and `plugin-biome` ↔ `biome-config`.

The unique constraint vs. `plugin-ts` is that `tsdown.config.*` is a **TS module**, not JSON. The kernel's `edit-json` DSL ([D-004]) doesn't apply — the escape hatch is `edit-text` with `magicast` as the in-process AST helper (already a kernel dep, also added as a `dependencies` entry on `plugin-tsdown` since the hook needs it at runtime).

## Options considered for the scaffolded artifact

The `@rrlab/tsdown-config` package exports two factory helpers, `defineBinConfig` and `defineLibConfig`, that wrap `tsdown.defineConfig(...)` with sensible defaults. The question: what shape does the scaffolded `tsdown.config.ts` take?

- **A**: Keep the helper factories as the package API; scaffold a thin call site — `import { defineLibConfig } from "@rrlab/tsdown-config"; export default defineLibConfig();`.
- **B**: Restructure `@rrlab/tsdown-config` to expose subpath exports (`./bin`, `./lib`) of fully-realised configs; scaffold a re-export — `export { default } from "@rrlab/tsdown-config/lib";`. Mirrors `@rrlab/ts-config/<preset>` more literally.
- **C**: Both — keep the helpers AND add subpath exports.

### Decision: Option A

A is the literal application of [D-004]: code-as-template for new files, `edit-text` + `magicast` for the existing-file escape hatch. The other options force a JSON-`extends`-style mental model onto a TS module that was deliberately scoped out of `edit-json`.

Concretely:

- The default-preset scaffold is `import { defineLibConfig } from "@rrlab/tsdown-config"; export default defineLibConfig();` (or `defineBinConfig` when the user picks the `bin` preset).
- Override ergonomics for the dominant edit pattern stay intact: `defineLibConfig({ entry: [...], external: [...] })`. The factories use `{ ...defaults, ...userOpts }`, so user options keep overriding the baseline.
- This matches the existing `vland/templates/*/tsdown.config.ts` precedent in this repo — those template files use bare `defineConfig({...})` (no shared package), reinforcing the mental model that `tsdown.config.ts` is a user-owned working file.

The 8 in-repo consumers (clibuddy, loggy, vland, plugin-{ts,tsdown,biome,oxc}, cli) continue to use the same `defineLibConfig({...})` API; the move is otherwise mechanical (`@vlandoss/tsdown-config` → `@rrlab/tsdown-config`).

## Options considered for uninstall detection

Detecting whether `tsdown.config.*` is "our scaffold" so uninstall can remove or rewrite it without touching unrelated user code:

- **Byte-match**: compare file content against the scaffolded template byte-for-byte.
- **AST-match via `magicast`**: parse, verify the default export is a `CallExpression` whose callee is `defineLibConfig` or `defineBinConfig` AND whose import resolves to `@rrlab/tsdown-config`.

### Decision: AST-match

Byte-match breaks predictably:

- A formatter run (biome / prettier) normalises quotes or adds a trailing newline → byte-match misses.
- The user adds a comment line `// scaffolded by rr plugins add tsdown` → byte-match misses.
- LF vs CRLF on Windows clones → byte-match misses.

AST-match is robust against all three. It also mirrors `plugin-ts`'s `uninstall()` (which reads + parses `tsconfig.json` with `comment-json` to decide between `delete` and `edit-json`) — same pattern, different parser.

## Install/uninstall semantics

### Install

- **No file** → prompt to scaffold, prompt preset, emit `create` FileOp.
- **File exists, interactive** → prompt `patch` / `skip` / `overwrite`:
  - **patch** → `edit-text` op that uses `magicast` to (1) verify the default export is `defineConfig(...)` from `tsdown` or one of our factories, (2) swap the import to `@rrlab/tsdown-config`, (3) rename the callee. **Refuses to mutate** non-`defineConfig` default exports — throws a clear error rather than guess.
  - **skip** → no FileOp.
  - **overwrite** → `create` with `overwrite: true`.
- **File exists, `--yes` / non-interactive** → `skip`. We deliberately diverge from `plugin-ts`'s default-to-patch policy ([D-004]'s "notes for human review") because rewriting a TS module non-interactively is higher-risk than patching JSON; the user can opt in by re-running interactively.

### Uninstall (symmetric)

- Always emits `removeDependencies: ["tsdown", "@rrlab/tsdown-config"]`.
- If no file → no FileOp.
- If file's default export is a no-arg call to one of our factories from `@rrlab/tsdown-config` → emit `delete`.
- If file's default export uses our factory **with arguments** → emit `edit-text` op that rewrites back to `defineConfig` from `"tsdown"`, preserving the user's args. User loses our baseline defaults (`dts: true`, `format: "esm"`, default `entry`), which is correct: they're uninstalling the package.
- If file's default export isn't recognisably ours → no FileOp (don't touch user code we didn't write).

## Default preset

`lib`. Empirical: 7 of 9 in-repo `tsdown.config.ts` files use `defineLibConfig` (or its inline `defineConfig` equivalent in templates). Semantic: `lib` enables `dts: true`, which is the differentiator for an npm-shippable library; `bin` projects typically know they're `bin` projects from the start. One re-run fixes a wrong default; zero work when the default is right.

## Alternatives rejected

- **Option B (subpath exports + re-export scaffold)**: trades off override ergonomics (the dominant edit pattern: 1× per project) for slightly simpler uninstall detection (1× per project ever). Breaks the 9 in-repo consumers' override style. Re-litigates [D-004]'s "code-as-template, AST escape hatch via `edit-text`."
- **Option C (both)**: two APIs for the same outcome → drift hazard, no compensating win. Fails the simplicity tiebreaker.
- **Byte-match uninstall detection**: brittle against formatters, comments, and line endings.
- **Default-to-patch under `--yes`** (à la `plugin-ts`): a TS-module rewrite is higher-risk than a JSON patch; we prefer the user to opt in interactively rather than have an agent silently rewrite their build config.

## Implementation notes

- `magicast`'s `$callee` is a snapshot string set at proxy-creation time (no setter). To rename the callee, we mutate the underlying AST node via `def.$ast.callee.name = "..."` — `generateCode` reads from the AST, not the proxy snapshots.
- `magicast` writes the import it swaps in its own style: `import { x } from "..."`, with inner spaces since 0.5. The user's formatter will re-apply their style on next run; same trade-off accepted by [D-004] for `comment-json`.
- The plugin reports the renamed config package version as `^0.1.0` in the install hook's `devDependencies`, matching `plugin-ts`'s placeholder for `@rrlab/ts-config`. Real version pin lands on first publish via Changesets.

## Notes for human review

`@vlandoss/{clibuddy,loggy,vland}` now devDep on `@rrlab/tsdown-config` — a cross-org dependency. Allowed under root `CLAUDE.md`'s cross-pollination clause ("clibuddy and loggy are shared utilities both stacks depend on"); flagged because it's the first time the dependency direction goes `@vlandoss/*` → `@rrlab/*`.
