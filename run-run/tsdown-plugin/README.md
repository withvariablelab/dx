# tsdown-plugin

`@rrlab/tsdown-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [tsdown](https://tsdown.dev). It gives `rr` the `pack` capability, which builds a TypeScript package for npm.

## Install

```sh
rr plugins add tsdown
```

`rr plugins add` installs `@rrlab/tsdown-plugin` and adds `tsdown` as a dev dependency. It adds `typescript` too, which tsdown needs to write declarations, unless the package already has it in `dependencies` or `devDependencies`. Once you confirm, it writes a `tsdown.config.ts` that calls a helper from [`@rrlab/tsdown-config`](https://www.npmjs.com/package/@rrlab/tsdown-config), for the kind of build you pick:

- `lib`: a library, with declarations and the entry `src/index.ts`. It is the default.
- `bin`: a CLI or Node binary, with the entry `src/run.ts`.

If a `tsdown.config.*` already exists, you choose to patch it, keep it or overwrite it. Patching turns a default export that calls `defineConfig()` from `tsdown`, or either helper, into a call to the helper you picked, and keeps its options. It refuses any other shape.

It needs `@rrlab/cli`, tsdown 0.22 or later and, to write declarations, TypeScript 5 or later. With TypeScript 7, tsdown writes declarations only in a package with a `tsconfig.json`, so the `typescript` it adds is TypeScript 6.

## What it provides

| Capability | Commands                    |
| ---------- | --------------------------- |
| `pack`     | `rr pack`, `rr pack doctor` |

With the `lib` preset, `rr pack` writes ESM JavaScript and `.d.ts` declarations to `dist/`, so consumers can `import` from the published package.

## Configuration

The `tsdown.config.ts` it writes for the `lib` preset:

```ts
import { defineLibConfig } from "@rrlab/tsdown-config";

export default defineLibConfig();
```

Pass tsdown options to the helper to override its defaults, such as `defineLibConfig({ entry: ["src/lib.ts"] })`.

## Removal

```sh
rr plugins remove tsdown
```

It removes `tsdown` and `@rrlab/tsdown-config` from `package.json`, and keeps `typescript`, which the project or another plugin may use. If `tsdown.config.*` is the file it wrote, it deletes it; if you passed options to the helper, it rewrites the file to `defineConfig()` from `tsdown` and keeps them; any other config is left alone. Then it drops `tsdown()` from `run-run.config.{ts,mts}`.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
