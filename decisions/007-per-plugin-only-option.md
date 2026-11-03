# 007: How should plugins narrow which capabilities they contribute to the registry?

> **Superseded by [009](./009-declarative-plugin-shape.md).** The per-plugin narrowing _principle_ is preserved (typing is per-plugin via `keyof ReturnType<capabilities>`), but the `only`-filter implementation moves from copy-paste-per-plugin to a single implementation inside `definePlugin`. 007's rejection of the kernel-helper Option B was conditional on no SDK-shaped centralisation existing inside `@rrlab/cli/plugin`; 009 introduces that centralisation while keeping the kernel-internal contract posture intact.

- **Date**: 2026-05-21
- **Status**: Superseded by 009
- **Files affected**: `run-run/cli/src/plugin/registry.ts`, `run-run/cli/src/plugin/__tests__/registry.test.ts`, `run-run/biome-plugin/src/index.ts`, `run-run/oxc-plugin/src/index.ts`, `run-run/ts-plugin/src/index.ts`, `run-run/tsdown-plugin/src/index.ts`, plus each plugin's `__tests__/` and a new integration test under `run-run/cli/test/integration/`.

## Context

`PluginRegistry.get<K>(capability)` throws when N>1 plugins provide the same capability (`run-run/cli/src/plugin/registry.ts:19-25`). Today that makes biome + oxc mutually exclusive: both register `lint` and `format`. A real use case has emerged — running biome for `lint`/`format` while oxc provides a forthcoming `tsc` capability backed by `oxlint --type-aware --type-check` (`oxlint-tsgolint` is already a peer of `@rrlab/oxc-plugin`). The registry's multi-provider error message already anticipates this: _"Disambiguate by narrowing each plugin's capabilities in run-run.config.ts."_ — but no mechanism exists.

`definePlugin<T>` (`run-run/cli/src/plugin/define-plugin.ts:3`) already supports a typed options generic, so per-plugin options are free at the type level.

## Options considered

- **A**: Per-plugin `only?: readonly K[]` option, plugin self-filters its `setup()` return. `K` is typed against the kinds _that plugin_ can provide.
- **B**: Kernel helper `narrow(plugin: Plugin, only: PluginCapability[]): Plugin` exported from `@rrlab/cli/plugin`.
- **C**: Registry-level config shape change — `plugins: [{ plugin: oxc(), kinds: ['tsc'] }]`.

## Decision: Option A

Each official plugin parameterises `definePlugin<TOptions>` with an options shape that includes `only?: readonly K[]`, where `K` is the union of kinds _that plugin_ provides. The plugin self-filters inside `setup()`. Example:

```ts
type OxcKind = "lint" | "format" | "typecheck";
type OxcOptions = { only?: readonly OxcKind[] };

const oxc = definePlugin<OxcOptions>((opts = {}) => ({
  name: "oxc", apiVersion: 1, install, uninstall,
  async setup({ shell }) {
    const all = { lint: lintSvc, format: fmtSvc, typecheck: tscSvc };
    if (!opts.only) return all;
    return Object.fromEntries(opts.only.map((k) => [k, all[k]])) as PluginCapabilities;
  },
}));
```

Reasons:

- Matches the kernel-agnostic rule (`run-run/CLAUDE.md` → "The kernel is tool-agnostic"): narrowing logic lives in the plugin, the kernel surface stays unchanged.
- Per-plugin typing is sharper than a kernel helper — `biome({ only: ['tsc'] })` is a compile error because biome doesn't provide `tsc`. A `narrow(plugin, capabilities[])` helper typed against the global `PluginCapability` union loses that.
- Reads better at the call site (`oxc({ only: ['tsc'] })` is configuration on the plugin, matching every other plugin-config knob).
- Zero new kernel exports. `definePlugin<T>` already supports the generic.
- ~3 lines × 4 plugins of duplication is exactly the trade `run-run/CLAUDE.md` endorses: _"Per-plugin duplication of small constants … is the right shape — duplication across plugins is cheap; coupling the kernel to tool details is not."_

### Sub-decisions

1. **Apply `only` to all 4 plugins for uniformity.** Even single-capability plugins (`ts`, `tsdown`) accept the option. The TS union constrains it to that plugin's kinds, so the knob is type-safe and self-documenting. Future-proofs the moment any single-capability plugin grows a second capability.

2. **Throw at `setup()` time when `only` lists a kind the plugin does not provide.** Mostly redundant with TS typing (config is typically `.ts`), but covers the `.mts`-without-strict-TS / `as any` cases. Matches the registry's existing "loud actionable errors" UX.

3. **`install()` stays coarse.** Narrowing is runtime-only. `rr plugins add oxc` continues to install `oxlint`+`oxfmt`+`oxlint-tsgolint` regardless of which capabilities the user later enables. If install footprint becomes a complaint, add per-tool install flags (`--no-tsgolint`) — don't couple install to runtime narrowing.

4. **`rr doctor` honours narrowing automatically.** `collectDistinctDoctors` iterates registered capabilities; narrowed-out capabilities are never registered, so they never appear in doctor output. Intentional, not accidental.

5. **Registry multi-provider error message gets tightened** to reference the new syntax: _"… use `<plugin>({ only: [...] })` to narrow which capabilities each plugin contributes."_ The existing test only asserts the plugin names appear, so the wording change is safe.

6. **`rr plugins remove`** does not need to learn about `only`. `ConfigAstService` removes the whole call node regardless of arguments, but an integration test should be added to lock down that magicast doesn't choke on an entry with an object argument.

## Alternatives rejected

- **Option B** (kernel helper `narrow(plugin, only)`): typing is weaker (uses the global `PluginCapability` union, accepts kinds the wrapped plugin doesn't provide); call-site reads as a wrapper-around-wrapper; introduces a new kernel concept the kernel-agnostic rule discourages. The ~3-line × 4-plugin duplication of Option A is cheaper than centralisation here.
- **Option C** (registry-level config shape): would change the public `defineConfig` array shape from `Plugin[]` to a union, breaking the `[biome(), ts()]` ergonomic to serve the 5% case. Also re-introduces pre-registry branching in the kernel, which decision 003 deliberately collapsed.

## Notes for human review

- This decision deliberately does NOT couple to the oxc `tsc` capability landing — that's a separate add. Shipping `only` first or together both work; the narrowing decision stands either way.
- Reviewed by `arch-critic` 2026-05-21; the recommendation above mirrors its conclusions.
