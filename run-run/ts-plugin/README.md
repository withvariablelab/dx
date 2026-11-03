# ts-plugin

`@rrlab/ts-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [TypeScript](https://www.typescriptlang.org). It gives `rr` the `typecheck` capability, backed by `tsc`.

## Install

```sh
rr plugins add ts
```

`rr plugins add` installs `@rrlab/ts-plugin` and adds `typescript` as a dev dependency. Once you confirm, it writes a `tsconfig.json` that extends one of the [`@rrlab/ts-config`](https://www.npmjs.com/package/@rrlab/ts-config) presets, which you pick:

- `react`: a React app.
- `dom-app`: a web app, with the DOM and no React.
- `dom-lib`: a browser library.
- `no-dom-app`: a Node.js app or CLI.
- `no-dom-lib`: a Node.js library.

The default is `react` when your project depends on `react`, and `no-dom-app` otherwise. The `no-dom-*` presets also add `@types/node`. If `tsconfig.json` already exists, you choose to patch it, which is the default, keep it or overwrite it.

It needs `@rrlab/cli` and TypeScript 5 or later, and the presets need TypeScript 5.4 or later.

## What it provides

| Capability  | Commands                                                 |
| ----------- | -------------------------------------------------------- |
| `typecheck` | `rr tsc` (workspace-aware in monorepos), `rr tsc doctor` |

## Configuration

The `tsconfig.json` it writes only extends the preset:

```json
{
  "extends": "@rrlab/ts-config/no-dom/app"
}
```

Set compiler options, `include` or `exclude` in your `tsconfig.json` to override the preset. The presets live in `@rrlab/ts-config`.

## Removal

```sh
rr plugins remove ts
```

It removes `typescript`, `@rrlab/ts-config` and `@types/node` from `package.json`. If `tsconfig.json` holds only the `extends` it wrote, it deletes the file; otherwise it unsets `extends` and leaves the rest of your settings. Then it drops `ts()` from `run-run.config.{ts,mts}`.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
