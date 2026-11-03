# 008: Should the plugin contract become its own package (`@rrlab/plugin`) instead of a subpath of `@rrlab/cli`?

> **Rejected — see [009](./009-declarative-plugin-shape.md).** This proposal was reviewed by `arch-critic` on 2026-05-21 and rejected before being applied. The substantive part of 008 (declarative `capabilities` shape inside `definePlugin`) was absorbed into 009, but the topology change (separate `@rrlab/plugin` package) was not adopted. Preserved as historical record of _why_ the package split was considered and rejected — that reasoning is load-bearing for any future revisit of the same idea.

- **Date**: 2026-05-21
- **Status**: Rejected
- **Files affected** (had it been applied): new package `run-run/plugin/`, deletions from `run-run/cli/src/plugin/`, swaps across the 4 plugins' `package.json` (peer + dev from `@rrlab/cli` to `@rrlab/plugin`), all plugin `src/index.ts` imports rewritten. Nothing actually changed in the repo from this proposal.

## Context

`@rrlab/cli/plugin` is a subpath export of the kernel package that ships the entire plugin contract (`Plugin`, `PluginCapabilities`, `definePlugin`, `ToolService`, capability interfaces, `FileOp`/`JsonEdit` types). The 4 official plugins peer-depend on `@rrlab/cli` solely to import that subpath — they never use the host runtime. Decision 007 just landed adding an `only` block duplicated across all 4 plugins (~8 LOC × 4) that the registry's multi-provider error message tells users to write. The duplication is a symptom of two concerns colliding in one package: the _host runtime_ (commander, registry impl, file-op engine, bin) and the _plugin SDK_ (contract + base classes + factory).

## Options considered

- **A**: Split. New `@rrlab/plugin` package owns the contract + base classes + a redesigned declarative `definePlugin`. Kernel retires the `/plugin` subpath and depends on the new package. `only` and bin-probing become first-class SDK features.
- **B**: Keep `@rrlab/cli/plugin` subpath; add `narrow()` + `probeBins()` helpers to it. Cheap refactor, no topology change.
- **C**: Status quo + accept the per-plugin duplication that 007 endorsed.

## Proposed: Option A (NOT ADOPTED)

The split was conceptually _appealing_ — `@rrlab/cli/plugin` as a name does hide the host-vs-SDK distinction. With a dedicated SDK boundary, `only`-filter and bin-probe could stop being "helpers each plugin opts into" and become responsibilities of the framework: the plugin author declares _what_ it provides; the SDK handles registration, filtering, and validation.

The kernel-agnostic rule (`run-run/CLAUDE.md` → "The kernel is tool-agnostic") would be preserved verbatim — `@rrlab/plugin` is equally tool-agnostic. The split would be on a different axis (SDK vs. host runtime), not on the tool-knowledge axis the rule guards.

### Sub-decisions that _would have_ applied

1. **What lives in `@rrlab/plugin`:** all contract types, capability interfaces, `ToolService` base class + `ToolServiceOptions`, `definePlugin` factory (redesigned — see #2), structural interface for `ReleaseService` (implementation stays in kernel).

2. **`definePlugin` becomes declarative.** New shape — `setup()` replaced by `capabilities(ctx)`. The SDK applies `only` filter (typed against `keyof ReturnType<capabilities>`), throws on unknown kinds, dedup-probes the services' `pkg` field, and surfaces a canonical "requires X" error.

3. **No imperative `setup()` escape hatch initially.** All 4 plugins fit the declarative shape. Add it only if a future plugin can't be expressed that way.

4. **`@rrlab/cli` no longer exports the `/plugin` subpath.**

5. **`defineConfig` stays in `@rrlab/cli`** (CLI config is a CLI concern).

6. **Peer dependency posture** (impacts decision 001): each plugin would have dropped `@rrlab/cli` from peer + dev and added `@rrlab/plugin`. `@rrlab/cli` would have added `@rrlab/plugin` as a regular `dependencies` — a deliberate carve-out from 001's "all peers."

7. **`apiVersion` stays at 1** — topology change, no contract version bump.

## Why this was rejected (by arch-critic, 2026-05-21)

Arch-critic's verdict in summary:

1. **"Naming dressed as packaging."** Nothing observable breaks in the single-package world. The proposal's own concessions admit the split is invisible to the install/uninstall flow and to `apiVersion`. The only thing it "fixes" is the import string — that's a rename, not a packaging justification.

2. **Publishing a separately versioned `@rrlab/plugin` package implicitly signals "stable API for external authors"** — exactly the opposite of the kernel-internal contract posture the repo-root `CLAUDE.md` makes explicit. The split would invert that posture by accident.

3. **The `requires?` override smell on day 1.** Oxc was 1/4 plugins and would have needed the override immediately for the bin-probe to produce a sensible error message — a 25% miss rate on the abstraction. The SDK telling you "this case doesn't fit, opt out" on its first real consumer is the abstraction telling you it's wrong.

4. **Misread of decision 001.** My draft paraphrased 001's load-bearing reason as "tarball size"; the actual primary reason is "consistency from the user's perspective." The proposed posture (`@rrlab/cli` deps on plugin, plugins peer on plugin) recreates exactly the inconsistency 001 set out to kill: same `@rrlab/*` concept declared two different ways across adjacent packages.

5. **The `apiVersion` claim was sophistry.** 008 argued 007's reasoning "still stands" by redefining "kernel" to exclude `@rrlab/plugin`. That's a definitional move, not a substantive one. Moving the `only`-filter into the SDK _is_ substantively what 007 rejected as Option B (kernel helper) — the SDK didn't exist as a concept then. If centralisation was right, 007 should be marked Superseded explicitly (which 009 does), not pretended-preserved.

6. **Test theater.** The proposed `sdk-boundary.test.ts` (parsing plugin source for `@rrlab/cli` imports) and `definePlugin-capabilities-shape.test.ts` were tautologies — asserting the kernel uses the API it has to use to function.

7. **Changeset bump policy was wrong** — peer dep swap is a major bump on plugins, not minor. The draft handwaved this.

## What was kept

The **substance** of 008's redesign (declarative `capabilities`, central `only`, central bin-probe) was correct and worth shipping. It moved into 009 _inside_ the existing `@rrlab/cli/plugin` subpath — same enforcement, none of the topology costs. 009 also added the helpers `decideScaffold` and `pickPreset` to capture install-time pattern duplication, plus a `plugin-discipline.test.ts` enforcement that 008 did not anticipate.

## When to revisit this

A package split would become justified if a concrete pressure appears that the single-package model can't absorb. Candidates worth re-opening this decision for:

- A real external plugin author wanting to publish to npm (the kernel-internal posture changes).
- `@rrlab/cli` growing native dependencies that plugin authors don't want to install transitively.
- The kernel's release cadence diverging significantly from the plugins' (today they ship together; if they didn't, decoupled versioning would matter).

None of those exist today. Until they do, the import string `from "@rrlab/cli/plugin"` is a cheap cognitive cost worth paying for the topology simplicity.

## Notes for human review

- This file is preserved as a "Rejected" record rather than deleted because (a) 009 references it explicitly in its alternatives section, and (b) the negative knowledge — _why_ the package split was rejected — is the load-bearing part for anyone considering the same idea in the future. Deleting it removes that and leaves only the gap in the directory listing.
- `decisions/README.md` currently lists three statuses (Applied, Pending human review, Overridden). "Rejected" is a fourth that the README doesn't formally name; if more proposals get drafted-then-rejected, the README should be amended to acknowledge it as a first-class status.
