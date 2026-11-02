# 012: Which package owns the parallel task-board that powers `rr check`'s per-project progress UX?

- **Date**: 2026-05-26
- **Status**: Pending human review
- **Files affected**: `shared/clibuddy/src/*` (new task-board service), `run-run/cli/src/program/commands/{check,tscheck,jscheck}.ts` (consumers)

## Context

`rr check` fans out per-package type checks with `Promise.all` and `stdio: "inherit"` (`tscheck.ts:95`), so in a 16-package monorepo all subprocesses interleave their output on one TTY with no per-package attribution, and `log.start`/`log.success` render static consola icons (`loggy.ts:63-69`), not a live spinner. The agreed UX is a TTY-aware parallel task-board: one live spinner row per project, collapsing to a status glyph with a duration, then each task's captured output flushed grouped under its package label + a summary; non-TTY/CI falls back to sequential grouped output. Its glyphs mirror `@clack/prompts` (the ◒◐◓◑ spinner, the gray `│ ┌ └` gutter) so it reads as one family with the clack-driven `rr plugins` flow. The board is tool-agnostic orchestration+presentation — the question is which layer owns it.

## Options considered

- **A**: `@vlandoss/loggy` — extend the logger with a multi-row live renderer. Shares the consola output surface.
- **B**: `@vlandoss/clibuddy` — a new service alongside `ShellService`, `palette`, `hasTTY`/`isCI`.
- **C**: `@rrlab/cli` kernel — a tool-agnostic `Reporter`/`TaskBoard` service next to its only caller.

## Decision: Option B (`@vlandoss/clibuddy`)

clibuddy is the only package that already owns every primitive the board composes: `ShellService` (produces the captured streams), `hasTTY`/`isCI` (`env.ts` — selects the render path), and `palette`/`colorize` (`colors.ts`). loggy's `AnyLogger` (`types.ts:9`) is a flat severity interface; a task orchestrator that runs N async tasks, owns concurrency, and captures subprocess output has no place on it. The kernel deliberately keeps its surface minimal and already sources terminal ergonomics from clibuddy (every plugin imports `colorize`/`isCI` from `@vlandoss/clibuddy`, e.g. `biome-plugin/src/index.ts:19`); a stateful renderer is pure terminal presentation, not plugin orchestration, so it's the wrong layer for the kernel. Housing it in clibuddy also keeps it reusable by `@vlandoss/vland`, which has the same fan-out-and-report need.

The board owns the terminal region while live and only hands back to `logger` on settle (clibuddy renders the live region; loggy prints the final grouped diagnostics + summary). That boundary is a deliberate contract, not a leak.

## Alternatives rejected

- Option A (loggy): widens a focused logger interface with orchestration + subprocess concepts it has no reason to know.
- Option C (kernel): unreusable by `@vlandoss/vland`, and grows kernel surface for pure terminal presentation that the repo already houses in clibuddy.

## Notes for human review

- This _adds_ a clibuddy service; it does not refactor clibuddy's existing API, so it stays within the `run-run/CLAUDE.md` "don't refactor clibuddy while doing run-run work" guard. It still lands as its own clibuddy change with its own changeset, then consumed by the kernel.
- Paired with [013](013-check-stream-to-capture-contract.md), which covers the stream→capture change the board depends on.
