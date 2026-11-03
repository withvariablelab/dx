# 004: Templating strategy + JSON edit DSL for install/uninstall hooks

- **Date**: 2026-05-19
- **Amended**: 2026-10-18 — an edit that changes nothing leaves the file byte-identical, and biome-plugin formats the `biome.json` it patches with Biome, because the user's formatter no longer re-applies their style before `rr check` runs (see 017)
- **Status**: Applied
- **Files affected**: `run-run/cli/src/plugin/types.ts`, `run-run/cli/src/services/json-edit.ts`, `run-run/cli/src/program/commands/plugins.ts`, each plugin's `install()` / `uninstall()` hook, `run-run/ts-config/`, `run-run/biome-config/`.

## Context

`rr plugins add <alias>` and `rr plugins remove <alias>` need to scaffold and unscaffold config files in the host project (`tsconfig.json`, `biome.json`, eventually `eslint.config.ts` and others). Two questions had to be settled together:

1. How is the file content generated when scaffolding from scratch?
2. How are existing files patched without destroying the user's content (comments, formatting, unrelated keys)?

The second question matters specifically for migration agents — running `rr plugins add ts --yes` against a legacy project that already has a `tsconfig.json` must produce a sensible patch, not blow the file away.

## Options considered for content generation

- **A**: Inline string construction via `JSON.stringify(obj, null, 2)` inside the install hook.
- **B**: External template files shipped with the plugin (`templates/*.json`) read at runtime.
- **C**: AST-based generation via `magicast`.

### Decision: Option A (code-as-template / thin local wrapper)

- The local file the install hook creates is a 2–5 line wrapper pointing to a shared `@rrlab/*-config` package via `extends`. All real configuration lives in the shared package.
- Inline construction: `JSON.stringify` for JSON files, template literals for the (currently hypothetical) TS modules. No templating engine.
- Why not B: file IO at runtime adds complexity and bundling friction; our wrappers are 3–5 lines.
- Why not C: AST surgery is overkill for files that are essentially constants; reserved as an escape hatch via `edit-text`.

## Options considered for editing existing files

- **A**: `JSON.parse` → mutate → `JSON.stringify` (lossy: kills comments, trailing commas, formatting).
- **B**: `jsonc-parser` (Microsoft, ~95 KB unpacked) — surgical edits over source text, preserves everything.
- **C**: `comment-json` (~56 KB unpacked) — drop-in `parse` / `stringify` with comments preserved via Symbol metadata; whitespace and quote style get normalised.

### Decision: Option C (`comment-json`)

- Lighter than `jsonc-parser` for the same outcome we actually care about (comments survive).
- Familiar mental model: `parse` → mutate → `stringify`, same as `JSON`. The only difference is that comments come along for the ride.
- Quote style and indent get normalised on re-write — acceptable cosmetic loss; the user's formatter (biome, prettier) re-applies their style on next run. **No longer holds** (amended by 017): `rr check` reports formatting without fixing it, so a reflowed file fails it right after `rr plugins add`. An edit that changes nothing now leaves the file byte-identical, and biome-plugin formats the `biome.json` it patches. Any other real change is still normalised.

## Edit DSL

Plugins describe the change declaratively; the kernel applies via `comment-json`. The contract:

```ts
type FileOp =
  | { kind: "create"; path: string; content: string; overwrite?: boolean }
  | { kind: "edit-json"; path: string; edits: JsonEdit[] }
  | { kind: "edit-text"; path: string; edit: (source: string) => string }  // escape hatch
  | { kind: "delete"; path: string };

type JsonEdit =
  | { op: "set"; path: string; value: unknown; mode?: "replace" | "if-missing" }
  | { op: "unset"; path: string }
  | { op: "include"; path: string; value: unknown; position?: "start" | "end" }
  | { op: "exclude"; path: string; value: unknown };
```

- **Paths use JSON Pointer (RFC 6901)** — standard `"/extends"`, `"/compilerOptions/strict"`. Devs with JSON Patch experience recognise it.
- **Ops are NOT RFC 6902** — RFC 6902 ops (`add` / `replace`) fail on path-condition mismatches. Our use cases need _idempotent_ merge semantics (the plugin can't know the file's state when constructing the patch), which `set` with `mode` + `include` / `exclude` express directly.
- **Symmetric pairs**: `set` / `unset`, `include` / `exclude`. The uninstall hook produces the inverse ops to undo install.

## Disaggregation of the shared config packages

The old `@vlandoss/config` package bundled both the TS presets and the Biome preset. Splitting them matches the all-peer model — one shared config package per tool, opt-in alongside its plugin:

| Before                                    | After                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `@vlandoss/config/ts/<preset>`            | `@rrlab/ts-config/<preset>` (`run-run/ts-config/`)                                           |
| `@vlandoss/config/biome`                  | `@rrlab/biome-config` (`run-run/biome-config/`)                                              |
| `@vlandoss/config/lefthook/turborepo.yml` | inlined into the monorepo's `lefthook.yml` (it was monorepo plumbing, not a per-tool preset) |

`packages/config/` deleted. `@rrlab/*-config` packages declare their tool as a `peerDependency` (semantic — the JSON schema URL / compiler options are version-coupled) even though `rr plugins add` handles the install automatically. The peer keeps the contract honest for users who install the config package directly.

## Notes for human review

The `--yes` / non-interactive flow defaults to **patch existing file** rather than skip, on the theory that an agent driving the migration wants the new setup applied while preserving user customizations. Plugin install hooks for the v1.0 set (`plugin-{biome,ts}`) read the existing file to decide whether to emit `create` (new file), `edit-json` (patch in place), or `delete` (file becomes semantically empty after `uninstall`).
