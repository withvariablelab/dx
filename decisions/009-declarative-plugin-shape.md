# 009: How do we make the plugin pattern hard to deviate from — one canonical shape across all 4 plugins?

- **Date**: 2026-05-21
- **Status**: Pending human review
- **Files affected**: `run-run/cli/src/plugin/define-plugin.ts` (redesigned), `run-run/cli/src/plugin/types.ts` (Plugin.setup → Plugin.capabilities; new helper types), `run-run/cli/src/plugin/decide-scaffold.ts` (new), `run-run/cli/src/plugin/pick-preset.ts` (new), `run-run/cli/src/plugin/bin-probe.ts` (new), `run-run/cli/src/lib/plugin.ts` (re-exports new helpers), `run-run/cli/src/services/ctx.ts` (call `capabilities` instead of `setup`), each of `run-run/{biome,oxc,ts,tsdown}-plugin/src/index.ts` (rewrite to declarative shape; drop local `only`/bin-probe/scaffold-decision/preset-pick code; consume helpers from `@rrlab/cli/plugin`), each plugin's `src/__tests__/setup.test.ts` (rewrite against new shape), `run-run/cli/src/plugin/__tests__/define-plugin.test.ts` (new), `run-run/cli/src/plugin/__tests__/decide-scaffold.test.ts` (new), `run-run/cli/src/plugin/__tests__/pick-preset.test.ts` (new), `run-run/cli/src/plugin/__tests__/bin-probe.test.ts` (new), `run-run/cli/test/integration/plugin-discipline.test.ts` (new — AST scan rejecting direct `ctx.prompts` in plugins), `decisions/007-per-plugin-only-option.md` (status changed to Superseded with pointer to 009).

## Context

The 4 official plugins reimplement the same housekeeping in subtly different ways: an `only`-filter block, a bin-probe try/catch, an "exists → ask → patch/skip/overwrite" scaffold-decision dialog, and a preset-pick prompt. The duplication is not just LOC — it's _prompt strings_, _error message formats_, and _decision branches_ that drift independently. Decision 007 endorsed the `only`-block duplication on the principle that "duplication across plugins is cheap"; user feedback after 007 reframes the goal as "the plugin pattern should be hard to break" — under that framing, duplication-as-copy-paste is the failure mode, not the solution.

A prior draft (`decisions/008-plugin-sdk-split.md`, rejected by arch-critic on 2026-05-21) proposed splitting the contract into a new `@rrlab/plugin` package. The split was rejected because the enforcement gain comes from `definePlugin`'s shape, not from the package boundary — and the split incurred a deviation from decision 001, a version-skew vector, and an "external API" signal that contradicts the kernel-internal contract posture. This decision keeps the contract inside `@rrlab/cli/plugin` and captures the enforcement directly there.

## Options considered

- **A**: Status quo + small helpers (`narrow`, `probeBins`) opt-in. Each plugin still chooses whether to use them. The 007 "duplication is cheap" trade stands.
- **B**: Redesign `definePlugin` to be declarative (`capabilities` map instead of imperative `setup`). Centralise `only`, bin-probe, scaffold-decision, and preset-pick as first-class features the SDK applies — plugins declare data, not procedure.
- **C**: Split contract into `@rrlab/plugin` package + redesign (rejected via 008's arch-critic review).

## Decision: Option B

The user-stated goal is "the plugin pattern should be hard to break." That outcome comes from making the canonical path the _only_ path: the SDK accepts data and runs the procedure, instead of accepting a procedure and trusting the plugin to follow convention. Centralisation lives inside `@rrlab/cli/plugin` — same subpath, no new package, no decision 001 churn. The cost is a one-time rewrite of the 4 plugins; the payoff is that the next plugin (5th, 6th, ...) cannot diverge on `only`, bin-probe, scaffold prompts, or preset selection even if the author wanted to — those shapes are typed into `definePlugin`'s signature.

### Sub-decisions

1. **`Plugin.setup` → `Plugin.capabilities`.** The plugin returns a record `{ kind: service }` rather than imperatively calling registry methods. `only` is typed against `keyof ReturnType<capabilities>` so `biome({ only: ["tsc"] })` is a compile error. The SDK applies the `only` filter and the unknown-kind runtime guard before handing the result to the registry. The plugin author writes zero filtering code.

2. **Bin-probe lives inside `definePlugin`.** The SDK introspects the `pkg` field of each `ToolService` returned by `capabilities()`, dedups, probes the distinct set in parallel via `ToolService.getBinDir`, and on failure throws a single canonical error:

   ```
   @rrlab/<name>-plugin requires <pkg>[, <pkg>]... to be installed in the host project.
   Run: rr plugins add <name>  (or: pnpm add -D <pkg>...)
   ```

   `<name>` comes from the plugin definition. No per-plugin override needed on day 1 — the oxc case (3 services backed by 2 distinct bins) resolves cleanly via deduplication on `pkg`. If a future plugin demonstrates that introspection-from-services is genuinely insufficient, _then_ add a `requires?: string[]` override; do not add it preemptively.

3. **`decideScaffold(ctx, opts)` helper.** Centralises the "file exists? ask user → patch/skip/overwrite vs. create" dialog used by biome, ts, and tsdown today. Signature:

   ```ts
   type ScaffoldDecision = "create" | "patch" | "overwrite" | "skip";

   export async function decideScaffold(
     ctx: InstallContext,
     opts: {
       label: string;      // e.g. "biome.json", "tsconfig.json"
       fileExists: boolean;
       patchHint: string;  // e.g. "add @rrlab/biome-config to extends, keep my other settings"
     }
   ): Promise<ScaffoldDecision>;
   ```

   Honours `ctx.flags.yes` / `ctx.flags.nonInteractive` (returns `"create"` if !exists, `"patch"` if exists — except tsdown's exception below). The four option labels become canonical; the prompt messages become canonical. Plugins that need "skip on existing under `--yes`" semantics (tsdown today) pass a flag `unattendedExistingAction: "skip" | "patch"` (default `"patch"`). Captures the only legitimate divergence.

4. **`pickPreset(ctx, opts)` helper.** Centralises the preset-selection prompt used by ts and tsdown. Signature:

   ```ts
   export async function pickPreset<K extends string>(
     ctx: InstallContext,
     opts: {
       message: string;
       presets: Record<K, { label: string }>;
       defaultPreset: K;
     }
   ): Promise<K>;
   ```

   Honours `--yes` / non-interactive (returns `defaultPreset`).

5. **Plugin authoring rule: plugins do NOT use `ctx.prompts` directly.** All user interaction in `install()` / `uninstall()` flows through `decideScaffold` and `pickPreset`. New helpers added here as new patterns emerge. This is the rule that makes new plugins boring to write _and_ impossible to drift.

6. **Enforce rule #5 mechanically.** A new test `run-run/cli/test/integration/plugin-discipline.test.ts` scans each `run-run/*-plugin/src/**/*.ts` and asserts no AST node matches `ctx.prompts.<anything>` outside of allowlisted helper internals. Cheap, fast, and locks the discipline in for the lifetime of the repo. This is _not_ tautological — it asserts about plugin code, which we explicitly want to constrain.

7. **`pathExists` is dropped as a shared helper.** It's `try { await fs.access(p); return true } catch { return false }` — 4 LOC, fine inline. Or move to `@vlandoss/clibuddy` if it accumulates a third user. Don't add it to `@rrlab/cli/plugin`; the SDK should host things that enforce shape, not random fs utilities.

8. **`definePlugin`'s generic still carries the plugin's options shape**. `definePlugin<TOptions>(...)` is unchanged at the call signature; only the returned `Plugin` object's interior shape (`capabilities` instead of `setup`) is new. Plugin-specific options (e.g. nothing today, but a hypothetical `biome({ schema: '2.5.0' })`) keep working.

9. **`apiVersion` stays at 1.** Internal contract evolution; no version bump from the registry's perspective.

10. **Decision 007 is marked Superseded by 009.** The honest reading is that centralising the `only`-filter inside `definePlugin` _is_ substantively what 007 rejected as Option B (kernel helper) — the SDK didn't exist as a concept then. 007's typed-against-plugin-kinds requirement is preserved (via `keyof` in this design), but the "where the code lives" answer changes. A pointer header is added to `decisions/007-per-plugin-only-option.md`.

11. **Decision 008 is deleted.** Per `decisions/README.md`'s "delete is preferred when the override fully replaces it" — 008's substance lives in 009 (declarative shape) without 008's topology change.

12. **Decision 001 is untouched.** No package split, no peer-vs-deps carve-out, no consistency loss.

### Test plan

**Layer 1 — SDK unit tests in `run-run/cli/src/plugin/__tests__/`** (kernel package, no new package):

- `define-plugin.test.ts`:
  - Plugin returned exposes `Plugin` shape the registry expects.
  - `only` filter applied to the returned capabilities map.
  - `only` with unknown kind throws with the canonical error message (the plugin-author UX 007 #2 codified).
  - Type-level: `expectTypeOf<Parameters<typeof biome>[0]["only"]>().toEqualTypeOf<readonly BiomeKind[] | undefined>()` — `only` is constrained to the plugin's own kinds via `keyof ReturnType<capabilities>`.

- `bin-probe.test.ts`:
  - Distinct-`pkg` deduplication: services sharing a `pkg` produce one probe.
  - Failure path lists distinct pkg names in the error message.
  - Parallel execution (assert via a counter + a delayed mock).

- `decide-scaffold.test.ts`:
  - `--yes` + `!exists` → `"create"`.
  - `--yes` + exists + default `unattendedExistingAction` → `"patch"`.
  - `--yes` + exists + `unattendedExistingAction: "skip"` → `"skip"` (the tsdown case).
  - Interactive paths drive the prompt with the canonical labels (snapshot the prompt calls).

- `pick-preset.test.ts`:
  - `--yes` returns `defaultPreset`.
  - Interactive returns the user's choice.
  - Cancellation throws "Cancelled by user."

**Layer 2 — kernel tests** (existing, must stay green without behaviour change):

- `run-run/cli/src/plugin/__tests__/registry.test.ts` — registry consumes the post-redesign `Plugin` shape. Multi-provider error message wording from 007 is preserved.
- `run-run/cli/src/services/__tests__/json-edit.test.ts` — unchanged.
- `run-run/cli/src/services/__tests__/config-ast.test.ts` — unchanged.

**Layer 3 — plugin tests, rewritten** (`run-run/*-plugin/src/__tests__/setup.test.ts`):

- Each plugin's existing `setup.test.ts` (added in this branch) is rewritten to exercise the declarative path. Assertions about `only` filtering and bin-absent errors stay — they now come from the SDK's behaviour, hit via the plugin under test.

**Layer 4 — integration tests** (`run-run/cli/test/integration/`):

- `only.test.ts` (existing): kept; fixture continues to work because the user-facing `biome({ only: [...] })` call shape is unchanged.
- `plugins.test.ts` (existing): `rr plugins add` / `remove` across all 4 plugins. Must stay green without modification — install/uninstall behaviour is unchanged.
- **NEW `plugin-discipline.test.ts`**: AST-scans `run-run/*-plugin/src/**/*.ts` and asserts:
  - No direct `ctx.prompts.<member>` call expression in any plugin source file.
  - No plugin source file imports `@clack/prompts` directly.

  Fails the suite if a new plugin tries to roll its own prompt. This is the enforcement test — the mechanical reason new plugins stay boring.

### Migration order (single PR / changeset wave)

1. Add new helpers (`decide-scaffold.ts`, `pick-preset.ts`, `bin-probe.ts`) under `run-run/cli/src/plugin/`.
2. Redesign `define-plugin.ts` (declarative `capabilities` + integrated `only` + integrated bin-probe).
3. Update `run-run/cli/src/lib/plugin.ts` to re-export the new helpers from `@rrlab/cli/plugin`.
4. Update `run-run/cli/src/plugin/types.ts`: `Plugin.setup` → `Plugin.capabilities`.
5. Update `run-run/cli/src/services/ctx.ts` to call `capabilities()` instead of `setup()`.
6. Add SDK unit tests (Layer 1).
7. Rewrite each plugin's `src/index.ts` against the new shape; delete local `only`/bin-probe/`decideScaffoldAction`/`pickPreset`/`pathExists` definitions.
8. Rewrite each plugin's `setup.test.ts` against the new shape.
9. Add `plugin-discipline.test.ts`.
10. Mark `decisions/007-per-plugin-only-option.md` as Superseded with a pointer header.
11. Delete `decisions/008-plugin-sdk-split.md`.
12. Changeset: minor on `@rrlab/cli` (contract change, new public helpers on the subpath), minor on each plugin (consumes new helpers; user-facing surface unchanged). No major because the user's `run-run.config.mts` does not change.
13. `pnpm build && pnpm test && pnpm rr check` green.

## Alternatives rejected

- **Option A** (status quo + opt-in helpers): Doesn't address the goal. As long as the helpers are opt-in, "each plugin does whatever it wants" survives — a plugin can skip them. The whole value of this decision is that the canonical path is the _only_ path.
- **Option C** (`@rrlab/plugin` package + redesign): Rejected via 008's arch-critic review. The enforcement gain comes from `definePlugin`'s shape, not from a package boundary. The split's costs (decision 001 deviation, version-skew vector, "external API" signalling against kernel-internal posture) are not bought by any concrete enforcement improvement. 009 captures the substance without the topology change.
- **Day-1 `requires?` override on bin-probe**: Rejected as preemptive. The oxc case resolves via `pkg`-dedup. Add the override only when a future plugin proves it necessary.
- **`pathExists` as a shared helper in `@rrlab/cli/plugin`**: Rejected. The SDK should host things that enforce shape; `pathExists` is a generic fs util. Drop it (use `fs.access` inline) or move it to `@vlandoss/clibuddy` if a third user emerges.

## Notes for human review

- 007 is being honestly Superseded, not "reinterpreted to still apply." The Supersede header on 007 should read something like: "Superseded by 009. The per-plugin narrowing principle is preserved (typing is per-plugin via `keyof`), but the `only`-filter implementation moves from copy-paste-per-plugin to a single implementation inside `definePlugin`. 007's rejection of the kernel-helper Option B was conditional on no SDK-shaped centralisation existing; 009 introduces that centralisation while keeping the kernel-internal contract posture intact."
- 008 is deleted, not Overridden — its core proposal (package split) is not adopted in any form. 009 absorbs only 008's secondary idea (declarative `capabilities`) and re-anchors it inside the existing kernel package.
- The `plugin-discipline.test.ts` AST scan is the part most worth a human gut-check. It's the difference between "a convention" and "an enforced rule." If you'd rather start with a Biome rule (via `@rrlab/biome-config`) instead of a test, that's also fine and probably more idiomatic in this stack — but a test is the smallest possible enforcement and lands inside this PR.
- The `decideScaffold` helper's `unattendedExistingAction` flag exists because tsdown today skips on existing+yes (since the existing file may be user-written code) while biome/ts patch on existing+yes (since the existing file is JSON we can edit safely). The flag captures that single legitimate divergence; everything else collapses.
