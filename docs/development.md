# Development

How to work on dx in a clone. The [contributing guide](contributing.md) covers how a change gets in.

## Layout

- [`run-run/`](../run-run): run-run. `cli/` is `@rrlab/cli`, the kernel and the `rr` command. Each `*-plugin/` wraps one tool, and each `*-config/` is a preset that a plugin installs. [`run-run/CLAUDE.md`](../run-run/CLAUDE.md) covers the architecture: the plugin contract and how to add or change a plugin.
- [`vland/`](../vland): vland. `cli/` is `@variablelab/vland`, and `templates/` holds the projects `vland init` starts from.
- [`shared/`](../shared): `@variablelab/clibuddy` and `@variablelab/loggy`, the internal packages the CLIs depend on.
- [`decisions/`](../decisions): the architecture decisions, one file each.
- `docs/`: this guide and the [contributing guide](contributing.md).

The workspace is pnpm, the tasks run through [Turborepo](https://turborepo.com), and tsdown builds each package that has a build step.

## Setup

[mise](https://mise.jdx.dev) 2026.10.19 or later pins Node 24, pnpm 12, [usage](https://usage.jdx.dev) and [gitleaks](https://github.com/gitleaks/gitleaks) in `mise.toml`, locked in `mise.lock`. It also puts `node_modules/.bin` on the `PATH`, so `rr` and `vland` run by name.

```sh
git clone git@github.com:withvariablelab/dx.git
cd dx
mise install
pnpm install
```

`pnpm install` also installs the git hooks: lefthook's postinstall writes them. With `CI` set, that postinstall skips them, so after a `CI=1 pnpm install` run `pnpm lefthook install` to add them.

The published packages declare `engines.node` as `>=22.18.0`, except `@rrlab/biome-config` and `@rrlab/ts-config`, which hold only JSON presets and declare none. `mise.floor.toml` pins that floor, and `MISE_ENV=floor` runs the repo on it, as CI does:

```sh
MISE_ENV=floor mise install
MISE_ENV=floor mise exec -- pnpm test
```

To raise the floor, change `mise.floor.toml` and every `engines.node` together, then run `MISE_ENV=floor mise lock`.

## Tasks

```sh
pnpm build                       # build every package
pnpm test                        # build, then run every package's tests
pnpm rr check                    # format, lint and type check, with the repo's own rr
pnpm rr jsc --fix                # apply Biome's fixes
pnpm tscheck                     # rr tsc in each package with a tscheck script
pnpm --filter @rrlab/cli test    # one package's tests
```

`pnpm test:unit` and `pnpm test:integration` run one kind of test. Unit tests live in `src/**/__tests__/`, and integration tests in `test/integration/`.

In the repo, `pnpm rr` and `pnpm vland`, or `rr` and `vland` with mise, run each CLI from its `src/`, so an edit shows up without a build.

## CI

- **On each pull request to `main`:** CI sets up mise 2026.10.19 and the locked tools with [mise-action](https://github.com/jdx/mise-action), then runs `pnpm install --frozen-lockfile`, `pnpm rr check`, `pnpm test` and `pnpm build`, once on the Node floor in `mise.floor.toml` and once on the version in `mise.toml`. Beside them, gitleaks scans the pull request's commits for secrets. The required `Test` check passes when all three do. Adding a label runs CI again, and labels added at once don't cancel one another's runs. Of those runs, only one that adds `preview` to a branch other than `feat/*` or `fix/*` publishes a preview, and a pull request opened on such a branch with `preview` publishes from that run only. Workflow audit runs [zizmor](https://docs.zizmor.sh) on every workflow in the repo, including those the vland templates generate.
- **Git hooks** ([lefthook](https://lefthook.dev)): `lefthook.yml` extends the two configs that `@rrlab/cli` ships, `run-run/cli/lefthook/base.yml` and `run-run/cli/lefthook/turborepo.yml`, and its own `shared-hooks` job fails a commit, saying to run `pnpm install`, when they are missing from `node_modules`. Their jobs are listed in [the cli's README](../run-run/cli/README.md#git-hooks). `lefthook/turborepo.yml` is not dx's: it holds the hooks that other repos fetch remotely.
- **Every Monday:** `pnpm audit` on the lockfile, which keeps an issue labeled `dependency-audit` open while it finds known vulnerabilities (Dependency audit).

## Preview releases

A pull request from a `feat/*` or `fix/*` branch, or with the `preview` label, publishes each package it changes, and the packages that depend on them, to npm under the `pr-<number>` tag, once the tests pass. `vland-bot` comments the published versions on the pull request. To try a preview, install the package with that tag:

```sh
pnpm add -D @rrlab/cli@pr-123
```

For a `@rrlab/*-plugin` package, `rr plugins add` takes the same `@<tag>` suffix and passes it on to the plugin's `@rrlab/*-config` sibling, falling back to `latest` for a sibling the preview didn't publish:

```sh
rr plugins add biome@pr-123
```

## Generated files

`run-run/cli/CLI.md` and `vland/cli/CLI.md` are generated, so don't edit them by hand. The cli docs workflow builds each CLI, which writes `dist/cli.usage.kdl`, and runs `usage generate markdown` on it. To see the result locally:

```sh
pnpm --filter ./run-run/cli build
usage generate markdown --file run-run/cli/dist/cli.usage.kdl --out-file run-run/cli/CLI.md --replace-pre-with-code-fences
```

Each `vland/templates/*/mise.lock` is generated by `mise lock`. After changing a template's `mise.toml`, run `mise lock` in that template's directory and commit both files together: `vland init` fetches the templates from `main`, and the CI it generates runs `mise install --locked`, which fails on a tool the lock is missing.
