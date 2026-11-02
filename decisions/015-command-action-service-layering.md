# 015: Make `command → action → service` explicit and let the kernel own plugin `ui`

- **Date**: 2026-05-29
- **Status**: Pending human review
- **Files affected**: adds `src/actions/**` (free-function use-cases), `src/errors/**` + `src/lib/plugin/errors.ts` (domain error classes), `src/render/**` (presentation), `src/ui/{align,theme}.ts`; moves `src/plugin/**` → `src/lib/plugin/**`; rewrites `src/program/commands/**` into thin commander wrappers; centralizes plugin coloring in `services/plugins-registry.ts` (`paint`) + `PluginRegistry`. Refines [003](003-wire-plugins-via-registry.md), [014](014-unified-command-ui.md).

## Context

Command bodies under `src/program/commands/**` mixed commander wiring with business logic, and the `plugins` command was a ~390-line monolith. Tool labels (`ui`) were defined inside each plugin, so the four official plugins each hand-rolled a colored label. We wanted the business logic to stop depending on the CLI framework — both for testability and so the framework choice stays cheap to revisit (this work landed by porting the framework-agnostic pieces of the oclif spike back onto commander).

## Options considered

- **A**: Lift command bodies into free-function actions (`<Name>ActionConfig` objects) under `src/actions/`; commands resolve the provider + delegate. Centralize `ui` in the registry (kernel paints capability impls at register time via `Registered<T>`); plugins drop their `ui`. Domain errors become classes.
- **B**: Keep logic in command bodies; extract only the `plugins` monolith. Leave `ui` in the plugins.
- **C**: Introduce a generic command/handler abstraction layer to formalize the split.

## Decision: Option A

`actions/` is the use-case layer — pure functions importing only `services`/`render`/`lib`, never the framework — so the same action runs under any front-end and is unit-testable without spawning. Commander commands become thin controllers that resolve the provider (throwing `MissingPluginError` with their `static`-style `providers` list when absent) and call exactly one action. The kernel owning `ui` (one `PLUGINS_DIRECTORY` color per plugin, applied in `PluginRegistry.register`) removes four copies of label-coloring and keeps plugins free of presentation — consistent with the kernel-agnosticism principle (the directory keys on plugin _names_, never tool identities). Error classes build their message from structured args and do not set `this.name`, preserving the plain `Error:` prefix.

## Alternatives rejected

- Option B: leaves the framework coupling and the per-plugin `ui` duplication in place — defeats the testability + framework-portability goal.
- Option C: a generic handler abstraction adds indirection with no consumer asking for it; the `command → action → service` spine is already explicit without it.

## Notes for human review

- Behaviour-preserving + additive: full suite green (133 cli tests, 16/16 monorepo tasks), `rr check` green, `pnpm build` emits the `./plugin` entry at `dist/plugin/index.*`.
- New behaviour: `services/plugin-meta.ts` resolves plugin + tool versions, surfaced in `rr config`, `rr --version`, and the root-help plugins footer.
- The plugin `ui` removal touches all four official plugins in lockstep (the contract is kernel-internal).
