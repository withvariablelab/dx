# 016: How does a streaming passthrough (`rr test` → vitest) fit a kernel contract built entirely around captured output?

- **Date**: 2026-06-24
- **Status**: Pending human review
- **Files affected**: `run-run/cli/src/lib/plugin/tool-service.ts`, `run-run/cli/src/types/tool.ts`, `run-run/cli/src/lib/plugin/{types,index}.ts`, `run-run/cli/src/actions/test.ts`, `run-run/cli/src/program/commands/test.ts`, `run-run/cli/src/program/index.ts`, `run-run/cli/src/lib/plugin/directory.ts`, new package `run-run/vitest-plugin/`

## Context

Every existing capability (`lint`/`format`/`tsc`/`pack`) **captures** its tool's output (`ToolService.runReport` → `runCaptured` → task-board) and returns a `RunReport`. A test runner is categorically different: it needs an inherited TTY for watch mode, colors, interactive UI, and to forward `--help` to the tool. So `rr test` is a _streaming_ passthrough that returns an exit code, not a `RunReport`. `arch-critic` was consulted on how this fits the kernel.

## Options considered

- **A — capability/contract shape**: A1 add a generic `runStreamed()` to `ToolService` (sibling of `runReport`), capability returns an exit code · A2 force `test` through the captured board · A3 give the service its own shell, bypass `ToolService`.
- **B — capability name**: B1 `test` (verb-of-intent, like `lint`/`pack`) · B2 generic `run` (kernel only knows "spawn a bin").
- **C — `doctor` subcommand**: C1 keep it (repo convention) · C2 drop it (passthrough purity).
- **D — env-file resolution**: D1 plugin fs-checks, explicit-missing errors · D2 silently skip missing.
- **E — override flag name** (discovered during impl): `--env-file` vs a non-colliding token.

## Decision

- **A → A1.** `ToolService.runStreamed(command, args, opts): Promise<number>` wraps the existing streaming `shell.run()` (`stdio:"inherit"`, `verbose:false`). It's as tool-agnostic as `runReport`; any future passthrough reuses it. A2 contradicts D-013's streaming-vs-capture split; A3 duplicates `getBinDir`/`doctor`.
- **B → B1 (diverges from arch-critic, which recommended B2).** The capability key is `test`. Capability keys are the command's resolution key (`getServiceOrThrow(cap)`); a generic `run` would collide across unrelated passthrough plugins (two providers → `MultipleProvidersError`). The streaming _mechanism_ is shared via `runStreamed`; the capability _name_ stays 1:1 with the command, matching `lint`/`format`/`pack`.
- **C → C1.** Keep `doctor` (inherited from `ToolService`). `rr test doctor` reserves only the bare leading `doctor` token; `rr test run doctor` still forwards. Documented in the command description.
- **D → D1.** The plugin owns `resolveEnvFile`: defaults are first-existing-wins (`.env.test`, then `.env`); an explicit override that's missing throws (typo protection). The `.env` semantics and the node `--env-file=` mechanism stay in the plugin (kernel-agnostic).
- **E → rename to `--env <path>`** (user-confirmed). Node has an early scanner that consumes `--env-file`/`--env-file-if-exists` from the _entire_ argv regardless of position; since the `rr` bin runs `node src/run.ts "$@"`, a user's `--env-file` token is eaten by the `rr` process before Commander runs. `--env` is not a node flag (and vitest uses `--environment`, not `--env`), so it passes through cleanly. The plugin still spawns the child as `node --env-file=<resolved> <vitest-bin>` (there the flag precedes the script, so it's a legit node flag).

## Alternatives rejected

- A2: breaks watch/colors/`--help`; contradicts D-013.
- A3: duplicates bin-resolution + doctor that `ToolService` exists to share.
- B2: a generic `run` capability key collides across passthrough plugins.
- C2: makes vitest the lone plugin without `doctor`, which it still needs for top-level `rr doctor`.
- E `--env-file`: only recoverable by hardening the shared `rr` bin/entry (inject `--` + strip in `run.ts`) — a CLI-wide change to the kernel entrypoint for one plugin's flag, rejected in favor of a clean rename.

## Notes for human review

- New contract surface: `TestRunner`/`TestRunOptions` in `src/types/tool.ts`, `test?` in `PluginServices`, `runStreamed` on `ToolService`. No existing plugin needs to change.
- `--env` (not `--env-file`) is the one user-facing deviation from the original request, forced by Node's `--env-file` argv scanner. Default auto-load (`.env.test`→`.env`) is unaffected.
