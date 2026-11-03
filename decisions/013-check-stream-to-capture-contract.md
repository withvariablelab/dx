# 013: How does the task-board capture per-task output, decide pass/fail, and force color?

- **Date**: 2026-05-26
- **Status**: Pending human review
- **Files affected**: `run-run/cli/src/plugin/tool-service.ts`, `run-run/cli/src/types/tool.ts` (`RunReport`), `run-run/{biome,oxc,ts}-plugin/src/index.ts`, `run-run/cli/src/program/{board,composed-jsc}.ts` + `commands/{lint,format,jscheck,tscheck,check}.ts`

## Context

Every tool ran with `stdio: "inherit"` (`shell.ts:45`) — live stream. To attribute output per package and render a board ([012](012-check-task-board-placement.md)), the parallel fan-out tasks must capture stdout/stderr instead. Two follow-on questions: how do we decide a task's verdict, and how do we keep color once the child loses its TTY?

## Options considered

- **Verdict source**: (A) parse each tool's summary text for warning/error counts; (B) use the exit code — the tool's own verdict — and never parse.
- **Structured output**: investigated `--reporter`/`--format json`. biome (`--reporter=json`, exact `summary`) and oxlint (`--format=json`, severities) support it; **oxfmt and tsc have no machine output at all**.
- **What to show**: (C) only on failure; (D) always flush the captured output grouped under the package.
- **Force color**: (E) per-plugin flag; (F) runner injects `FORCE_COLOR=1`.
- **Shell surface**: reuse `runCaptured` vs a new method.

## Decision: B + D + E, capturing via `runCaptured`

- **B — verdict from the exit code, no parsing.** Text summaries are unstable across versions and _not uniform_: the same strategy must apply to all four tools (operator's call), and since tsc/oxfmt emit nothing machine-readable, a JSON path can't be uniform. So we drop count-parsing entirely. `RunReport` is just `{ ok, output }` where `ok` is `exitCode === 0`. No guessing.
- **D — always flush the captured output** grouped under the package label (pass or fail). The board owns the verdict (✔/✖) and progress; the tool owns what it prints. A clean tool that still prints a summary line (e.g. oxlint's `Found 0 warnings…`) is shown — accepted as the tool's own output, not noise we invented. Warnings that don't fail the exit code stay visible this way; if a user wants warnings to _fail_, they configure their linter (`--error-on-warnings`, `--max-warnings 0`) — `rr` does not impose that policy.
- **E — per-plugin force-color.** Tool-specific, so the kernel can't hold it (`run-run/CLAUDE.md`). biome already has `--colors=force`; ts adds `--pretty` (forces color off a TTY). oxlint/oxfmt expose no force-color flag and ignore `FORCE_COLOR`, so their captured output is monochrome — readable (ASCII miette frames), just uncolored. `FORCE_COLOR=1` injection is rejected: it doesn't help oxlint and inverts tool ownership.
- **Shell** — `ToolService.runReport(args, { cwd })` wraps `runCaptured` (`throwOnError: false`) so every task settles; the command aggregates `process.exitCode`. No new `ShellService` method.

## Alternatives rejected

- Parse tool summaries (A): fragile and non-uniform (tsc/oxfmt have no machine output) — exactly the guessing the operator vetoed.
- JSON reporters for biome/oxlint: deterministic, but (1) not uniform across the four tools, and (2) single-run JSON replaces the human output, so we'd have to re-render diagnostics ourselves or run twice (the slow oxlint type-aware path × N packages makes a second run unacceptable).
- Show output only on failure (C): would hide non-failing warnings — losing the "which packages have warnings" signal the operator wanted.
- `FORCE_COLOR=1` (F): no effect on oxlint, and violates the kernel-agnostic rule.

## Notes for human review

- Capture replaces streaming for the four check-family verbs (lint/format/static-check/type-check) in both single-app and monorepo — these are batch tools (no incremental output), so nothing live is lost and the board's spinner is a better progress signal. `pack` (tsdown) and user pre-scripts keep streaming.
- Contract change (`RunReport` return) propagated across all 4 plugins + `composedJscProvider` in one commit; no deprecation shims.
- Integration tests that asserted the streamed `$ <tool>` echo now assert the board summary / the row label (the tool `ui`) / the flushed tool output, since the `$` echo no longer prints under capture.

### Post-review refinements (TUI/UX review, 2026-05-26)

Three TUI-design reviews of the dogfooded output drove these follow-ups, all consistent with the exit-code-verdict rule (still no output parsing):

- **A three-state board (✔/⚠/✖) was tried and reverted.** The reviews pushed for a `warn` state so non-failing findings don't read as a green pass. We tried it via "exit 0 + has output ⟹ warning", suppressing the clean trailers of biome/oxfmt (`quietWhenOk`). It doesn't hold: **oxlint prints a "Found 0 warnings… Finished in…" summary even when clean** (and exits 0 on real warnings), so "passing + has output" can't distinguish a clean trailer from a warning _without parsing_ — exactly what 013 forbids. Reverted to **two states by exit code (✔/✖)** and we surface findings by **always flushing the tool's own output** (dimmed on a pass so it recedes but stays visible — it's also the user-requested proof that the tool ran; full brightness on a failure). A user who wants warnings to _fail_ configures their linter (`--max-warnings 0` / biome `--error-on-warnings`); `rr` stays faithful to the exit code.
- **Composite `rr check` verdict (kept).** `check` prints one final line (`✔ check passed` / `✖ check failed · <section>`) so a passing section can't be the last line of a run that failed in another section. It correlates each section's `BoardResult` (collected by `runCheckSections`) back to the section name.
- **Command stays visible under capture.** The streaming path prints `$ <cmd>` via `printCmdLine`; the captured path lost it. Rather than add a `command` field to `RunReport` (the command is _how_ it ran, not part of the _result_), `ToolService.runReport` leads its captured `output` with a dim `$ <bin> <args>` line. The board then hoists a leading line shared by every task (the identical command across a monorepo's packages) so it shows once, not per package.
- **The frame is for composition, not row count.** The `┌ │ └` frame is opt-in (`frame: true`) and only `rr check` sets it, to divide its `jsc`/`tsc` sections. A standalone command never frames — even a monorepo `rr tsc` with N package rows is _one_ command, so it renders as a plain title + rows + summary (no gutter). Single-task standalone runs stay fully compact.
- **Robustness/polish (kept):** the gutter moved from a fixed truecolor hex to the 16-color `gray` (theme-adaptive, degrades on non-truecolor/CI); failing detail is capped (`+N more lines`); the framed-single section closes with a summary instead of a bare `└`; the summary duration is the wall-clock span, not a single task's time.
- **Known limitations (accepted):** the `(tool)` label suffix reflects the configured plugin, so it differs across repos using different tools; there is no ASCII fallback for the unicode glyphs (the audience matches `@clack/prompts`' footprint); the board's `│` gutter and biome's own `│`/`━━━` frames stack on failure detail — kept because frame-continuity through the detail was an explicit product call; oxlint suppresses its summary when captured (non-TTY), so a clean `tsc` row may show no proof-of-work while biome's always does — a per-tool behaviour we don't override.
