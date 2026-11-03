# ts-config

`@rrlab/ts-config` holds the TypeScript presets of [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli), built on [`@total-typescript/tsconfig`](https://github.com/total-typescript/tsconfig). The `tsconfig.json` that [`@rrlab/ts-plugin`](https://www.npmjs.com/package/@rrlab/ts-plugin) writes extends one of them.

## Install

If you use run-run:

```sh
rr plugins add ts
```

It asks for a preset and writes your `tsconfig.json`.

Without run-run, install it by hand:

```sh
pnpm add -D @rrlab/ts-config typescript @types/node
```

Then point your `tsconfig.json` at one of the presets below.

It needs TypeScript 5.4 or later: the presets set `module` to `preserve`, which TypeScript 5.4 added. The `no-dom` presets also need `@types/node` 20 or later, an optional peer.

## Presets

- `@rrlab/ts-config/react`: a React app, with the browser DOM and JSX.
- `@rrlab/ts-config/dom/app`: a web app, with the DOM and no React.
- `@rrlab/ts-config/dom/lib`: a browser library, with the DOM lib in scope.
- `@rrlab/ts-config/no-dom/app`: a Node.js app or CLI. It needs `@types/node`.
- `@rrlab/ts-config/no-dom/lib`: a Node.js library. It needs `@types/node`.

## Usage

A typical `tsconfig.json` only extends a preset:

```json
{
  "extends": "@rrlab/ts-config/no-dom/app"
}
```

Set compiler options, `include` or `exclude` in your `tsconfig.json`: your keys win over the preset.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
