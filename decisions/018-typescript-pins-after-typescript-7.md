# 018: Which TypeScript major does each plugin install, now that TypeScript 7 is out?

- **Date**: 2026-11-03
- **Status**: Applied
- **Files affected**: `run-run/ts-plugin/src/tool-versions.ts`, `run-run/tsdown-plugin/src/tool-versions.ts`, `run-run/tsdown-plugin/src/index.ts`, `run-run/tsdown-plugin/src/__tests__/install.test.ts`, `run-run/tsdown-plugin/src/__tests__/pack.test.ts`, `run-run/tsdown-plugin/package.json`, `run-run/astro-plugin/src/tool-versions.ts`, `run-run/astro-plugin/package.json`

## Context

Three plugins install `typescript` through `rr plugins add`: ts, tsdown and astro. Their pins matched until TypeScript 7, which not every tool they wrap runs on. `astro check` refuses it ("astro check does not currently support TypeScript 7.0. To continue using astro check, install TypeScript 6 instead."), and @astrojs/check's own peer range is `^5.0.0 || ^6.0.0`. tsdown 0.23 writes declarations with the tsgo generator when TypeScript 7 is installed, and tsgo refuses to run without the tsconfig.json that tsdown finds from the package up ("The `tsgo` generator requires a tsconfig file to be specified."). `tsc` itself runs on 7: `rr tsc` passes a clean file and fails a TS2322 on TypeScript 7.0.2, as on 5 and 6.

## Options considered

- **A**: One major for all three — every pin stays `^6.0.0` until `astro check` supports 7.
- **B**: Each plugin installs the newest major its tool runs on — ts and tsdown `^7.0.0`, astro `^6.0.0`. `arch-critic` recommended it on 2026-11-02.
- **C**: As B, but tsdown keeps `^6.0.0`, because a tsdown package without a tsconfig.json can't write declarations on 7.

## Decision: Option B

Each plugin owns its tool's install range (decision 010), so the pins need not match. ts and tsdown install `^7.0.0`, and their dev TypeScript is the catalog's. astro installs `^6.0.0`, with its dev TypeScript on 6.0.3, and its `typescript` peer stays `^5.0.0 || ^6.0.0`, because `astro check` refuses TypeScript 7. The maintainer chose B over C on 2026-11-03: "parece ser que astro aun no soporto ts7 asi que me parece valido la excepcion ahi, por otro lado la eleccion para tsdown-plugin me parece incorrecta, si ya soporta ts7 y solo exige un tsconfig.json esta ok para mi" (astro doesn't support TypeScript 7 yet, so its exception holds; tsdown does, and needing a tsconfig.json is fine).

ts-plugin owns tsconfig.json, so tsdown-plugin doesn't write one. Instead, `install()` checks before the `lib` build, which writes declarations: with no tsconfig.json in the package or a folder above it, it throws before anything is written, names the folder, and says to run `rr plugins add ts`. The add flow then rolls the plugin package back. `arch-critic` recommended this on 2026-11-03. The `bin` build writes no declarations and isn't checked, and neither is a package that keeps its own tsdown config.

## Alternatives rejected

- Option A: it holds the ts plugin back on a major whose `tsc` runs fine, for a limit that only `astro check` has.
- Option C: tsdown runs on TypeScript 7, and the maintainer accepts the tsconfig.json it needs.
- tsdown-plugin writes a tsconfig.json: the file would have two owners, and its content would either copy ts-plugin's presets or lean on TypeScript 7's defaults.
- `rr pack` checks for a tsconfig.json before running tsdown: it would fail `bin` builds and TypeScript 6 packages that build today.
- `rr pack` adds a hint after tsdown fails: it can tell tsgo's failure apart only by matching tsgo's error text.

## Notes for human review

- The check also stops a `lib` package whose own TypeScript is 6, which builds without a tsconfig.json. The fix is the same one-step `rr plugins add ts`.
- The order of `rr plugins add` decides a package's TypeScript: ts writes `^7.0.0` and astro writes `^6.0.0` wherever they run, and tsdown keeps the `typescript` it finds.
- When `astro check` supports TypeScript 7, astro moves its pin and its `typescript` peer, and its dev TypeScript goes to the catalog's.
