# tsdown-config

`@rrlab/tsdown-config` holds the [tsdown](https://tsdown.dev) configuration helpers of [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli). The `tsdown.config.ts` that [`@rrlab/tsdown-plugin`](https://www.npmjs.com/package/@rrlab/tsdown-plugin) writes calls one of them.

## Install

If you use run-run:

```sh
rr plugins add tsdown
```

Once you confirm, it asks for the kind of build, installs this package and writes a `tsdown.config.ts` that calls the matching helper.

Without run-run, install it by hand:

```sh
pnpm add -D @rrlab/tsdown-config tsdown
```

It needs tsdown 0.22 or later and Node 22.18 or later.

## Presets

- `defineLibConfig()`: a library. ESM with `.d.ts` declarations, from the entry `src/index.ts`.
- `defineBinConfig()`: a CLI or Node binary. ESM for the `node` platform, from the entry `src/run.ts`.

Each helper wraps tsdown's `defineConfig()` and takes tsdown's `UserConfig`, which this package also exports. Your options are spread over the defaults, so they win.

## Usage

```ts
// tsdown.config.ts
import { defineLibConfig } from "@rrlab/tsdown-config";

export default defineLibConfig();
```

Pass tsdown options to override a default, such as `defineLibConfig({ entry: ["src/lib.ts"] })`.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
