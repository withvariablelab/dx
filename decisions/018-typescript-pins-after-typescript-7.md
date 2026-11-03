# 018: Which TypeScript major does each plugin install, now that TypeScript 7 is out?

- **Date**: 2026-11-03
- **Status**: Applied
- **Files affected**: `run-run/ts-plugin/src/tool-versions.ts`, `run-run/tsdown-plugin/src/tool-versions.ts`, `run-run/tsdown-plugin/src/__tests__/pack.test.ts`, `run-run/tsdown-plugin/package.json`, `run-run/astro-plugin/src/tool-versions.ts`, `run-run/astro-plugin/package.json`

## Context

Three plugins install `typescript` through `rr plugins add`: ts, tsdown and astro. Their pins matched until TypeScript 7, which not every tool they wrap runs on. `astro check` refuses it ("astro check does not currently support TypeScript 7.0. To continue using astro check, install TypeScript 6 instead."), and @astrojs/check's own peer range is `^5.0.0 || ^6.0.0`. tsdown 0.23 writes declarations with the tsgo generator when TypeScript 7 is installed, and tsgo refuses to run in a package without a tsconfig file ("The `tsgo` generator requires a tsconfig file to be specified."). `tsc` itself runs on 7: `rr tsc` passes a clean file and fails a TS2322 on TypeScript 7.0.2, as on 5 and 6.

## Options considered

- **A**: One major for all three — every pin stays `^6.0.0` until `astro check` supports 7.
- **B**: Each plugin installs the newest major its tool runs on — ts and tsdown `^7.0.0`, astro `^6.0.0`. This is what the design review recommended.
- **C**: As B, but tsdown keeps `^6.0.0` — ts `^7.0.0`, tsdown `^6.0.0`, astro `^6.0.0` with the `typescript` peer `^5.0.0 || ^6.0.0`.

## Decision: Option C

Each plugin owns its tool's install range (decision 010), so the pins need not match, and B's reasoning holds for ts and astro. ts and astro both provide `typecheck`, so they can't share a config, and their pins never meet in one package's plugin list. ts installs `^7.0.0`, the major its tests run on. astro installs `^6.0.0`, and its peer stays `^5.0.0 || ^6.0.0`, because `astro check` refuses TypeScript 7.

tsdown is where B breaks. tsdown-plugin never overwrites an existing `typescript`: it adds one only to a package that has none, and its pin is for that package, a tsdown package without the ts plugin. tsdown-plugin writes no tsconfig.json, so on TypeScript 7 that package's `rr pack` stops with the tsgo error above. On TypeScript 6 it builds. So tsdown keeps `^6.0.0`, with dev TypeScript 6.0.3, and `pack.test.ts` builds the scaffold that `install()` writes in a package without a tsconfig.json.

## Alternatives rejected

- Option A: it holds the ts plugin back on a major whose `tsc` runs fine, for a limit that only `astro check` has.
- Option B: tsdown's `^7.0.0` breaks the build of the very package its pin is for.
- tsdown-plugin writes a tsconfig.json so it can move to 7: the ts plugin owns that file, and the change is a scaffolding design of its own, not a version move.

## Notes for human review

- The order of `rr plugins add` decides a package's TypeScript. astro after tsdown leaves `^6.0.0`. ts writes `^7.0.0` wherever it runs, so a tsdown package that adds ts moves to 7, and it then has the tsconfig.json that tsgo needs, unless it declines the one ts offers to write. tsdown after ts keeps the `^7.0.0` it finds.
- When `astro check` supports TypeScript 7, astro moves its pin and its `typescript` peer, and its dev TypeScript goes to the catalog's.
- When tsdown-plugin writes a tsconfig.json, or tsgo stops needing one, tsdown moves to `^7.0.0`, and its dev TypeScript goes back to the catalog's.
