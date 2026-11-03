# astro-plugin

`@rrlab/astro-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [`astro check`](https://docs.astro.build/en/reference/cli-reference/#astro-check). It gives `rr` the `typecheck` capability, so `rr tsc` and `rr check` type-check `.astro` files along with the rest of the project.

## Install

```sh
rr plugins add astro
```

`rr plugins add` installs `@rrlab/astro-plugin` and adds `@astrojs/check` and `typescript` as dev dependencies: `astro check` needs both. It writes no config file: your Astro project already has its `tsconfig.json`, and `astro` stays your project's own dependency.

It needs `@rrlab/cli`, Astro 5 or later, `@astrojs/check` 0.9 or later, and TypeScript 5 or 6.

## What it provides

| Capability  | Commands                                                             |
| ----------- | -------------------------------------------------------------------- |
| `typecheck` | `rr tsc` (workspace-aware in monorepos), `rr check`, `rr tsc doctor` |

`rr tsc` runs `astro check` in an Astro package: one with an `astro.config.*`, or with `astro` in its `dependencies`, `devDependencies` or `peerDependencies`. It reports the same diagnostics as `astro check`, for `.astro` files and plain `.ts` files alike, and fails when `astro check` exits non-zero, which it does on any error by default.

In a monorepo, `rr tsc` checks each package with a `tsconfig.json`. It runs `astro check` in the Astro packages and `tsc --noEmit` in the others, so `astro` type-checks the whole workspace.

`astro check` also checks your `.ts` files, so in an Astro project it replaces `ts`. Configure one `typecheck` provider. If another plugin also provides one, such as `ts` or `oxc`, narrow it: `oxc({ only: ["lint", "format"] })`.

If `@astrojs/check` or `typescript` is missing, `rr tsc` fails and names it. Left alone, `astro check` would prompt to install them instead of checking anything. A package that isn't an Astro package needs only `typescript`.

`rr tsc doctor` checks the packages `rr tsc` checks, each for the checker `rr tsc` runs there: `astro` and what `astro check` needs in an Astro package, `tsc` in the others.

## Removal

```sh
rr plugins remove astro
```

It removes `@astrojs/check` and `typescript` from `package.json`, and drops `astro()` from `run-run.config.{ts,mts}`. It leaves `astro` and your `tsconfig.json` alone.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
