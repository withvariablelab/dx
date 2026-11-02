# 014: How do all commands share one board UI without repeating the wiring?

- **Date**: 2026-05-26
- **Status**: Pending human review
- **Files affected**: `run-run/cli/src/program/board.ts` (`runToolCommand`), `run-run/cli/src/program/commands/{lint,format,jscheck,pack,doctor}.ts`, `run-run/cli/src/types/tool.ts` (`Packer.pack` → `RunReport`; `Doctor.doctor` → `RunReport`; `DoctorResult`/`DoctorOutput` removed), `run-run/cli/src/plugin/tool-service.ts` (`doctor()` → `RunReport`), `run-run/cli/src/program/composed-jsc.ts`, `run-run/tsdown-plugin/src/index.ts`

## Context

After the board redesign (012/013), `lint`/`format`/`jsc`/`tsc` render the task board but each command repeats the same action wiring (`missingPluginError` → `runBoard([reportTask(withTarget(`<name> (<ui>)`, appPkg), verb)])` → `process.exitCode`). `pack` still streams (returns `void`), and `doctor` prints via `logger`. The goal: every command shares the same UI, with a reusable abstraction. Invoked `arch-critic`.

## Options considered

- **A**: A `UIService` on `Context` (`ctx.ui.run(...)`). A class wrapping the board.
- **B**: Free functions in `board.ts` — one `runToolCommand(ctx, spec)` absorbing the repeated action body; commands keep their own `createCommand().summary().description().option()` scaffold.
- **C**: A declarative `createToolCommand({ name, kind, verb, … })` factory building the whole command from a spec.

## Decision: Option B

- The board is stateless; the only kernel state (`collector` in `board.ts`) is deliberately module-scoped because it spans `runCheckSections` → nested `runBoard` calls across the `parseAsync` sibling-dispatch boundary in `check`. A class instance can't hold that without becoming a second singleton — and the repo reserves singletons for `logger` alone. A `Service` with no constructor deps is a namespace cosplaying as a service. So **no `UIService`**.
- Option C fits only the three trivial commands: `jsc` needs custom provider resolution (`composedJscProvider`), `tsc` needs per-package fan-out + pre-scripts + monorepo branching, `check` resolves no provider. A factory would force escape hatches for every command that has real logic — abstraction pointed at the wrong cases.
- Option B extends the idiom already in `board.ts` (`reportTask`, `runBoard` are free functions). `runToolCommand(ctx, { name, kind, provider, run })` absorbs the genuinely-repeated action body; `tsc`/`check` keep calling `runBoard` directly (they have bespoke logic and should). The `.summary().description().option()` chain stays per-command — those strings are the command's identity, and the `doctor` subcommand + `addHelpText` block is 4 lines not worth hiding.

#### One canonical labeller

The labels were the real duplication — each command built `<command> (<tool>) · <package>` (or a fan-out title) by hand, and they'd drifted (`rr jsc doctor` showed bare `biome`; single-app `tsc` lacked the `· <pkg>`). Two free functions in `board.ts` are now the single source of truth, and every command/subcommand routes through them:
- `targetLabel(command, provider, appPkg)` → `<command> (<tool>) · <package>` for any single-target row (lint, format, jsc, pack, single-app tsc, every `doctor` subcommand). Dedups to just `<command>` when the tool's binary _is_ the command (so `tsc`, not `tsc (tsc)`).
- `fanoutTitle(command, provider?, count, unit)` → `<command> (<tool>) · <n> <unit>` for fan-out section titles (monorepo `tsc` → `tsc (oxlint) · 8 packages`; `rr doctor` → `doctor · 3 tools`, tool omitted because the rows span several tools and carry the per-tool name).

### Scope (which commands join the board)

- **lint, format, jsc, tsc, pack** — the plugin-backed tool runners (one exit-code verdict + captured output). `pack` joins via the contract change below.
- **doctor** — yes; it already fans out across every distinct provider in parallel, which is one-row-per-tool by nature. Adopted at the call site only (map `DoctorResult` → a board task); no contract change.
- **clean** — no. It's a filesystem op with no pass/fail verdict and no fan-out; a one-row always-passing board would be theatre. Stays `logger`-based. **Rule:** a command joins the board when it has ≥1 task with an independent pass/fail verdict; pure side-effect commands (`clean`, `config`, `completion`, `plugins`) stay on `logger`/clack.

### Contract changes

- **`Packer.pack()` → `Promise<RunReport>`.** Unifies the five tool-running verbs under one return type so `runToolCommand` covers all five. `TsdownService.pack` calls `runReport` instead of `exec`. Propagated in one commit (kernel-internal contract; only tsdown implements `pack`).
- **`Doctor.doctor()` → `Promise<RunReport>` (collapsed from `DoctorResult`).** arch-critic recommended keeping `DoctorResult` (for the subcommand's `process.exit(exitCode)` and the "healthy vs passed" semantic line). But once `doctor` rendered on the board it stopped using the structured exit code (the board aggregates `process.exitCode = 1`), and the human asked for full UI consolidation — specifically that `doctor` show the same `$ <command>` line as every other command. Keeping `DoctorResult` left `doctor` as the one verb whose output didn't flow through `runReport`'s `$ <cmd>` prepend. So `doctor()` now returns a `RunReport` whose `output` leads with `$ <bin> --help` (the liveness probe; the tool's full help text is dropped as noise) plus the error on failure. This removes the `DoctorResult`/`DoctorOutput` types entirely and lets `doctor` flow through `reportTask` like the verbs. Reverses arch-critic's Decision 3 at the human's direction.

## Alternatives rejected

- Option A (`UIService`): a stateless, dep-less class is ceremony; can't hold the `collector` ambient state without a forbidden second singleton.
- Option C (factory): only serves the already-short commands; leaks for `tsc`/`jsc`/`check`.
- Keeping `DoctorResult` distinct from `RunReport` (arch-critic's pick): rejected at the human's direction — see Decision 3; it kept `doctor` from showing the `$ <command>` line every other command shows, and its structured exit code went unused once `doctor` rendered on the board.

## Notes for human review

- **`pack` streaming tradeoff (overrides 013's carve-out).** Decision 013 kept `pack` streaming on purpose — a build emits incremental progress worth watching live, unlike the batch check tools. Moving `pack` to the captured board trades tsdown's live build log for a spinner + flushed-at-end output. The human chose UI uniformity over live build streaming; recorded here because it reverses a 013 note. The fallback (if live build feedback is later judged more valuable) is to leave `pack` as the one streaming command and not board-wire it.
