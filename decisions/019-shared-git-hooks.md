# 019: How do the repos that use `rr` share their git hooks?

- **Date**: 2026-11-03
- **Status**: Applied
- **Files affected**: `run-run/cli/lefthook/base.yml`, `run-run/cli/lefthook/turborepo.yml`, `run-run/cli/package.json`, `run-run/cli/test/integration/lefthook.test.ts`, `lefthook.yml`, `run-run/CLAUDE.md`

## Context

The repos that use `rr` run the same pre-commit jobs: `rr jsc --fix-staged`, `rr tsc` and gitleaks over the staged changes. Some fetched them from dx's own `lefthook/turborepo.yml` through lefthook's `remotes`, with no pinned version. Others copied the jobs into their own `lefthook.yml`. The maintainer chose to ship the jobs inside `@rrlab/cli`, so that a repo's lockfile pins them and no hook needs the network after install. What was left open is the shape of what ships. lefthook merges jobs that share a name, but the file in `extends` wins over the repo's own `lefthook.yml` (lefthook 2.2.2, checked with `lefthook dump`). So a repo cannot change a shared job's `run` from its own file. Pre-push differs between repos: affected tests in a Turborepo monorepo, `rr test run` in a single package, a filtered `pnpm test` in a workspace without Turborepo, and nothing in a site with no tests.

## Options considered

- **A**: One file whose pre-push `test` job has a default that other repos override by name.
- **B**: Two complete files, one for a Turborepo monorepo and one for a single package, each with the pre-commit jobs.
- **C**: Files a repo combines. `base.yml` holds the pre-commit jobs, and `turborepo.yml` holds the Turborepo pre-push job. A repo lists the ones it needs in `extends`.

## Decision: Option C

`arch-critic` recommended C on 2026-11-03. No shipped job has to be undone. The pre-commit jobs live in one file, and a repo that fits neither shape takes `base.yml` and writes its own `pre-push`. A Turborepo monorepo writes:

```yaml
extends:
  - node_modules/@rrlab/cli/lefthook/base.yml
  - node_modules/@rrlab/cli/lefthook/turborepo.yml
```

dx's own `lefthook.yml` is exactly that. Neither file extends the other: lefthook resolves an `extends` inside an extended file from the repo's root, not from the file. The kernel stays tool-agnostic (`run-run/CLAUDE.md`). `rr` never reads these files, and their jobs call `rr` and the repo setup they assume (pnpm, mise, gitleaks, Turborepo), never a plugin's tool. The `tsc` job's glob covers TypeScript files and tsconfigs. A repo whose type checker also reads other files, such as `.astro`, adds its own job with that glob. Adding a plugin changes neither file.

## Alternatives rejected

- Option A: a repo's own job of the same name loses to the shared one, so the default could not be overridden from the repo's own file.
- Option B: the pre-commit jobs would live in two files, and only one repo needs the single-package file.

## Notes for human review

- lefthook treats each `extends` entry as a glob, so a missing file matches nothing. `lefthook validate` says "All good", and no warning shows. When `node_modules/@rrlab/cli` is missing, or older than the version that ships these files, the commit goes through with none of the shared jobs, a staged secret included. `lefthook.test.ts` pins the files' paths and checks that the package ships them. Renaming or moving one is a breaking change for `@rrlab/cli`. CI's gitleaks scan still catches a secret the hook missed.
- A repo can also name `gitleaks` in its own `lefthook.yml`, with the same command. It then merges with the shared job, and it still runs when the shared file is missing (`lefthook.test.ts`).
- To change what a shared job runs, a repo lists its own file after the shared ones in `extends`. Setting `skip: true` on the job works from its own `lefthook.yml`.
- `lefthook/turborepo.yml` at dx's root stays as it is for the repos that still fetch it remotely.
