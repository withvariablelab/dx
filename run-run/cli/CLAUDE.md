# CLAUDE.md — `@rrlab/cli` (the kernel)

Internals of the kernel. Read **after** the repo-root `CLAUDE.md` and `run-run/CLAUDE.md`. Both establish the working principles and the plugin shape this file assumes you already know.

## Mental model

```
bin                                    (bash dispatcher — entry point)
 └─ src/run.ts                         (boots the program)
     └─ src/program/index.ts           (createProgram — builds the RunRunCmd tree)
         ├─ src/program/root.ts        (RunRunCmd extends Command — banner/footer/--version/--about/--usage)
         ├─ ContextService.getContext() (src/services/context.ts — wires shell, logger, config, ctx.plugins)
         │   ├─ ConfigService.load()   (src/services/config.ts — lilconfig)
         │   └─ for each config.plugins: plugin.services(ctx) → registry.register(...)
         │
         └─ commands                   (src/program/commands/*.ts — thin wrappers, built on src/program/base.ts)
             ├─ lint / format / jsc / tsc / test / pack
             │   ├─ ctx.plugins.getServiceOrThrow(capability)
             │   └─ delegate to one action (src/actions/*.ts)
             ├─ check                  (action calls jscAction + tscAction in-process)
             ├─ doctor                 (collects distinct providers, runs in parallel)
             ├─ plugins {list, add, remove}   (src/actions/plugins/*.ts)
             ├─ clean / config / completion
             └─ --usage                (KDL spec emission)
```

## Commander patterns we rely on

### Commands are thin wrappers over actions

Each `create<Name>Command(ctx)` resolves its service inside its `.action(...)` via `ctx.plugins.getServiceOrThrow(capability)` (which raises `MissingPluginError` when absent), then delegates to exactly one free-function action in `src/actions/`. Actions never import commander or `src/program/`. They take a single `<Name>ActionConfig` object: dependencies (`ctx`, the resolved service) at the top level, parsed flags and positional args under `options` and `args` (reuse the verb-option types from `src/types/tool.ts`). See `decisions/015-command-action-service-layering.md`.

Commands are built with `createCommand(name)` from `src/program/base.ts` (a `Cmd extends Command` subclass), **not** commander's own `createCommand`. `Cmd` adds these chainable methods:

- `.addCapabilities([...capabilities])` — declares which `PluginCapability`s the command exercises.
- `.addHelpTextAfter(ctx)` — appends the `See also:` / `Powered by:` block, both **auto-derived** from those capabilities (see below). No command hand-writes its cross-references anymore.
- `.addDoctorCommand(fn)` — attaches the per-tool `doctor` subcommand (always present; its callback resolves the provider lazily).

### The root is a `RunRunCmd` subclass

`src/program/root.ts` defines `RunRunCmd extends Command`. It registers `-v/--version` (plain version string), `--about` (credits) and `--usage` (KDL spec) as options with `option:*` listeners, and attaches the banner + installed/available plugins footer via `addHelpText`. `createProgram` in `src/program/index.ts` groups the commands (`.commandsGroup("Code quality:")` etc.).

### `--usage` emits a stable KDL spec

`RunRunCmd` listens for `option:usage` and calls `generateToStdout(this)` (`@usage-spec/commander`). The `bin` script forces `NO_COLOR=1` when it sees `--usage` so no ANSI escapes leak into the spec. Command summaries are static strings (no per-environment plugin annotations), so the KDL is already stable across machines — there's no summary-stripping step.

## Context lifecycle

`createProgram` calls `ContextService.getContext()` (`src/services/context.ts`) once per `rr <cmd>` invocation. Each call builds a fresh `ContextValue`:

```ts
type ContextValue = {
  binPkg: Pkg;          // @rrlab/cli's own package.json
  appPkg: Pkg;          // the host project's package.json (resolved from cwd)
  shell: ShellService;
  config: ExportedConfig;
  plugins: PluginServices;   // the facade over the populated PluginRegistry
};
```

The registry is populated immediately: for each `plugin` in `config.plugins ?? []`, the kernel calls `plugin.services(pluginContext)` and registers what it returns. If `apiVersion` doesn't match `1`, it throws `PluginApiVersionError`. The populated `PluginRegistry` is then wrapped in a `PluginServices` facade and exposed as `ctx.plugins`.

`clean` and `completion` take no context, and `config` reads it without resolving a service. The context is still built on every invocation that reaches Node (all but the `rr completion <shell>` fast path in `bin`). Don't try to lazy-load it; the cost is small (a plugin's `services()` is meant to be cheap) and the simplicity is worth more than the savings.

## ctx.plugins (the `PluginServices` facade)

A `PluginCapability` is a key of the `PluginServices` type in `src/lib/plugin/types.ts`. A **service** is the impl that satisfies it (a `Linter & Doctor`, etc.). One plugin instance can back several capabilities with the same service object.

`src/services/plugin-services.ts` defines the `PluginServices` **class** — the only plugin-resolution surface commands and actions touch (`ctx.plugins`). It wraps `PluginRegistry` and exposes:

- `getServiceOrThrow<K>(capability)` — returns the service, throwing `MissingPluginError` on N=0 and `MultipleProvidersError` on N>1. This is what commands call from inside their `.action(...)`, so command files never import `MissingPluginError`.
- `getJsChecker()` — the `jsc` resolver: a plugin claiming `jscheck` directly, else a `StaticCheckService` (`src/services/static-checker.ts`) composed from a separately-registered `lint` + `format`, else throws `MissingPluginError("jscheck")`. `jsc` has no single registry capability, so this — not `getServiceOrThrow` — is its entry point (shared by `rr jsc` and `rr check`).
- `providerOf<K>(capability)` — single-provider `{ plugin, service }` (or undefined; throws on N>1). Used by `Cmd.addHelpTextAfter` to derive the `Powered by:` line from each `plugin.ui`.
- `getAllServices()` — every distinct service instance, deduped **by reference** (a single service backing several capabilities appears once). Used by `rr doctor` so each tool's health check runs a single time.

(Beware the name overlap: the **class** `PluginServices` here is the facade; the **type** `PluginServices` in `src/lib/plugin/types.ts` is the `{ capability: service }` map a plugin's `services()` returns. Different layers.)

### PluginRegistry (kernel-internal)

`src/lib/plugin/registry.ts` is the raw store behind the facade — `register`, `getService`/`getServiceOrThrow`, `providerOf`/`providersOf`, `getAllServices`. Commands don't touch it directly; they go through `ctx.plugins`. Multi-provider error message format is load-bearing for the "ambiguity → user fixes config" UX. Don't simplify it; the test in `src/lib/plugin/__tests__/registry.test.ts` asserts the names appear.

## Commands

Every plugin-backed command file follows the same shape:

```ts
import type { ContextValue } from "#src/services/context.ts";
import { createCommand } from "../base.ts";

export function create<Name>Command(ctx: ContextValue) {
  return createCommand("<name>")
    .addCapabilities(["<kind>"])
    .summary("<summary>")
    .description("<description>")
    .option(...)
    .action(async (options) => {
      const service = ctx.plugins.getServiceOrThrow("<capability>");
      await <name>Action({ ctx, <service>, options });
    })
    .addHelpTextAfter(ctx)
    .addDoctorCommand(async () => {
      const service = ctx.plugins.getServiceOrThrow("<capability>");
      await doctorOneAction({ ctx, service });
    });
}
```

The service is resolved **inside** the action / doctor callback via `ctx.plugins.getServiceOrThrow`, not hoisted to the top of the factory — so the command tree is identical regardless of which plugins are configured (the `doctor` subcommand always exists; the throw happens only on invocation). That keeps `--help` and the `--usage` KDL spec stable across machines. `jsc` is the one exception: it has no single registry capability, so it resolves via `ctx.plugins.getJsChecker()` — the composed-capability resolver, shared with `rr check`.

`.addDoctorCommand(fn)` (on the `Cmd` base class) attaches the per-tool `doctor` subcommand that every plugin-backed command exposes; its callback resolves the service and delegates to `doctorOneAction`, rendering the canonical `doctor (<tool>) · <pkg>` row and running `service.doctor({ cwd })` in that package. `tsc doctor` is the exception: it delegates to `tscDoctorAction`, which checks the packages `tsc` checks, so in a monorepo it fans out to one row per workspace package with a `tsconfig.json`. A plugin whose health depends on the package (astro resolves `@astrojs/check` from it) reads `options.cwd` in its `doctor` override.

`MissingPluginError` (`src/errors/missing-plugin.ts`) takes just a `capability` and builds the `rr plugins add <alias>` hint by looking up which plugins provide it via `providersOf(capability)` in `src/lib/plugin/directory.ts`; `getServiceOrThrow` / `getJsChecker` raise it for you. The per-command `Powered by:` / `See also:` block is produced by `Cmd.addHelpTextAfter` (`src/program/base.ts`) and is **fully derived from the declared capabilities** — there's no `render/command-help.ts` / `render/powered-by.ts` anymore:

- **See also:** every sibling command (under the same parent) whose `addCapabilities` set overlaps this command's — so `lint` and `jsc` cross-reference each other automatically because both touch `lint`.
- **Powered by:** the `ui` of the plugin returned by `ctx.plugins.providerOf(capability)` across the command's capabilities.

It renders via the `Lines` builder and returns `""` (nothing appended) when both sets are empty. Commands with no plugin capabilities (e.g. `clean`) just pass a literal string to commander's native `.addHelpText("after", ...)`.

`rr check` is the exception: rather than dispatch through commander, its action calls `jscAction` then `tscAction` directly in-process — each wrapped in a `runCheckSections` scope so failures are attributed by section — and prints one aggregated verdict. In-process saves the ~80ms Node startup of a re-spawned `rr`.

## File ops engine (`applyFileOp`)

`src/services/file-ops.ts`. `applyFileOp` performs the filesystem work and returns a `FileOpOutcome` — it never writes to the terminal; the `plugins add/remove` actions map the outcome to clack log lines (`reportFileOp`), and `describeFileOp` renders a side-effect-free one-liner for the remove plan. It handles every `FileOp` kind in `src/lib/plugin/types.ts`:

- `create` — writes content; respects `overwrite` flag.
- `edit-json` — reads, applies `JsonEdit[]` via `applyJsonEdits` (in `src/services/json-edit.ts`), writes back. Uses `comment-json` so user comments + key positions survive. A real change re-stringifies the whole file (2-space indent, one array item per line); an edit that changes nothing leaves the file byte-identical and reports `unchanged`.
- `edit-text` — reads, calls `op.edit(source)`, writes back. Escape hatch for TS modules etc.
- `delete` — `fs.unlink`. Idempotent (skips if file doesn't exist).

`applyJsonEdits` implements the `JsonEdit` ops in `src/lib/plugin/types.ts` over JSON-Pointer paths. Tested in `src/services/__tests__/json-edit.test.ts`. The dedup in `include`/`exclude` uses `JSON.stringify` deep-equality — fine for the value shapes we use today (strings, plain objects).

## `rr plugins` lifecycle (add / remove)

The flows live in `src/actions/plugins/{add,remove,list}.ts`. Both resolve the alias via `PLUGINS_DIRECTORY` in `src/lib/plugin/directory.ts` (`allPluginNames`/`isPluginName` are the lookups). Only official aliases are accepted; an unknown alias throws `UnknownPluginError` with the list.

**add** flow:
1. Install the plugin package via `nypm.addDependency` (best-effort rollback via `removeDependency` if a later step throws).
2. Dynamic import the plugin, call `install(ctx)`.
3. Apply returned `devDependencies` via `nypm` (batched).
4. Apply returned `files` via `applyFileOp`.
5. Edit `run-run.config.{ts,mts}` via `ConfigAstService` (magicast wrapper) to add the plugin entry.

**remove** flow:
1. If installed, dynamic import and call `uninstall(ctx)`.
2. Aggregate the plan: config entry removal + file ops + deps to remove (including the plugin package itself).
3. Show the plan and a single confirmation (skipped with `--yes`).
4. Apply file ops, then edit config, then `removeDependency` per dep.

Both support `--dry-run` (print plan, no side effects) and `--yes` (skip prompts).

## `ConfigAstService`

`src/services/config-ast.ts`. Wraps `magicast` to add/remove plugin entries from `run-run.config.{ts,mts}`. Operates on the AST so user comments + formatting + non-plugin keys are preserved.

## Tests

- `src/**/__tests__/*.test.ts` — unit tests: no spawn, and fs only in a temp dir.
- `test/integration/*.test.ts` — spawn `rr` against a real fixture in `os.tmpdir()`. The fixture symlinks the workspace `node_modules` so the fixture's `run-run.config.mts` can import `@rrlab/*-plugin`.

When the integration test asserts on the doctor or output of a plugin-backed command, configure the fixture's `run-run.config.mts` with `fixtures.config([...aliases])`. See `test/integration/check.test.ts` for the canonical multi-plugin shape (biome + ts).

## What to keep an eye on

- `dist/cli.usage.kdl` is regenerated by the `build:kdl` script. If a command's summary, description, or option set changes, `pnpm --filter @rrlab/cli build` should be run and the KDL diff inspected before committing.
- `CLI.md` is generated: see [docs/development.md](../../docs/development.md#generated-files) to regenerate it locally.
- `bin` is a bash dispatcher with a fast path for `rr completion <shell>` (skips Node startup). Keep it minimal — anything new goes in `src/`, not `bin`.

## Anti-patterns we already paid for

- **Don't add a parallel action store on `PluginRegistry`.** A previous commit added `registerCommand` / `commandHandler` to feed `rr x` (a parallel-dispatch command). `rr x` was removed; the parallel store with it. Commander already holds the action tree — use `program.commands.find(...)` if you need to dispatch by name.
- **Don't use `JSON.parse(text) → mutate → JSON.stringify`** for editing user-owned files. That destroys comments + trailing commas + indentation. Use `edit-json` with `JsonEdit[]` and let `applyJsonEdits` route through `comment-json`.
- **Don't introduce `bin: { biome, … }` shims** in the kernel or in plugins. The peer-installed tool provides `node_modules/.bin/<bin>` natively. See `decisions/002-no-bin-shims.md`.
- **Don't put `tools` capability back.** It only made sense before the all-peer model (see `decisions/001-all-peer-dependencies.md`). The kernel surface is smaller without it.
- **Don't centralise tool versions (or any tool-specific concept) in the kernel.** An earlier attempt added a `TOOL_VERSIONS` constant in `@rrlab/cli/services/tool-versions.ts` and re-exported it via `@rrlab/cli/plugin`, so every plugin imported its version pins from the kernel. Wrong layer — it made the kernel know every tool name, coupled the kernel's release cycle to tool bumps, and inverted the ownership. Each plugin owns its tool's version pins in `*-plugin/src/tool-versions.ts`; the coherence test (install range within the `package.json` peer range) lives in the plugin too. See `run-run/CLAUDE.md` → "The kernel is tool-agnostic" for the rule and the test to apply before adding anything to `@rrlab/cli`.
