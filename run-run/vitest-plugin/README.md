# vitest-plugin

`@rrlab/vitest-plugin` is a [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli) plugin for [Vitest](https://vitest.dev). It gives `rr` the `test` capability, a thin passthrough to vitest.

## Install

```sh
rr plugins add vitest
```

`rr plugins add` installs `@rrlab/vitest-plugin` and adds `vitest` as a dev dependency. It writes no config file.

It needs `@rrlab/cli` and Vitest 3 or later.

## What it provides

| Capability | Commands                    |
| ---------- | --------------------------- |
| `test`     | `rr test`, `rr test doctor` |

## Usage

`rr test` forwards every flag and argument straight to vitest, so anything you'd type after `vitest` works unchanged:

```bash
rr test                      # run the suite
rr test run --coverage       # forwarded verbatim
rr test --project unit       # forwarded verbatim
rr test --help               # vitest's own help
rr test doctor               # health check (reserved by rr, not forwarded)
```

### Env files

By default `rr test` loads an env file before running, picking the **first that exists**:

1. `.env.test`
2. `.env`

Override it with `--env`, which must come before the forwarded args:

```bash
rr test --env=.env.ci run
```

> It's `--env`, not `--env-file`: Node's early `--env-file` scanner would grab
> that exact token off the `rr` process before the CLI could read it.

An explicit `--env` file that doesn't exist is an error, to catch typos. The defaults above are loaded only when present.

## Removal

```sh
rr plugins remove vitest
```

It removes `vitest` from `package.json`, and drops `vitest()` from `run-run.config.{ts,mts}`.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
