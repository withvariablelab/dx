# @rrlab/astro-plugin

Astro plugin for [`@rrlab/cli`](https://npmjs.com/package/@rrlab/cli). Provides the `typecheck` capability backed by [`astro check`](https://docs.astro.build/en/reference/cli-reference/#astro-check), so `rr tsc` and `rr check` type-check `.astro` files along with the rest of the project.

## Install

```sh
rr plugins add astro
```

`rr plugins add` installs `@rrlab/astro-plugin` and adds `@astrojs/check` and `typescript` as `devDependencies`: `astro check` needs both. It scaffolds no config: your Astro project already has its `tsconfig.json`, and `astro` itself stays your project's own dependency.

## What it provides

| Capability | Surface |
|---|---|
| `typecheck` | `rr tsc` (workspace-aware in monorepos), `rr check`, `rr tsc doctor` |

`rr tsc` runs `astro check` in each package with a `tsconfig.json`. It reports the same diagnostics as `astro check`, for `.astro` files and plain `.ts` files alike, and fails when `astro check` exits non-zero (any error, by default).

`astro check` also checks your `.ts` files, so in an Astro project it replaces `ts`. Configure one `typecheck` provider. If another plugin also provides one (`ts`, or `oxc`), narrow it, e.g. `oxc({ only: ["lint", "format"] })`.

If `@astrojs/check` or `typescript` is missing, `rr tsc` fails and names it. Left alone, `astro check` would prompt to install them instead of checking anything.

## Removal

```sh
rr plugins remove astro
```

Removes `@astrojs/check` and `typescript` from `package.json` and drops the `astro()` entry from `run-run.config.{ts,mts}`. `astro` and your `tsconfig.json` are left untouched.
