# 019: How do the repos that use `rr` share their git hooks?

- **Date**: 2026-11-03
- **Status**: Pending human review
- **Files affected**: `run-run/cli/lefthook/base.yml`, `run-run/cli/lefthook/turborepo.yml`, `run-run/cli/package.json`, `run-run/cli/test/integration/lefthook.test.ts`, `lefthook.yml`, `run-run/CLAUDE.md`

## Context

The maintainer chose to ship the pre-commit jobs that the repos using `rr` share (`rr jsc --fix-staged`, `rr tsc`, gitleaks) inside `@rrlab/cli`, so a repo's lockfile pins them. The shape of what ships was left open. In lefthook 2.2.2 the file in `extends` wins over the repo's own `lefthook.yml` for a job of the same name, and pre-push differs from one repo to the next: affected tests in a Turborepo monorepo, `rr test run` in a single package, and nothing in a site with no tests.

## Options considered

- **A**: One file whose pre-push `test` job has a default that other repos override by name.
- **B**: Two complete files, one for a Turborepo monorepo and one for a single package, each with the pre-commit jobs.
- **C**: Files a repo combines. `base.yml` holds the pre-commit jobs, and `turborepo.yml` holds the Turborepo pre-push job. A repo lists the ones it needs in `extends`.

## Decision: Option C

`arch-critic` recommended C on 2026-11-03. No shipped job has to be undone, the pre-commit jobs live in one file, and dx's own `lefthook.yml` extends both. Neither file extends the other, because lefthook resolves a nested `extends` from the repo's root. The kernel stays tool-agnostic: `rr` never reads these files, and their jobs call `rr` and the repo setup they assume (pnpm, mise, gitleaks, Turborepo), never a plugin's tool.

## Alternatives rejected

- Option A: the shared job wins over a repo's own job of the same name, so the default could not be overridden from the repo's own file.
- Option B: the pre-commit jobs would live in two files, and only one repo needs the single-package file.

## Notes for human review

- A missing `extends` file matches nothing, and no warning shows. So with `node_modules/@rrlab/cli` absent, or older than the version that ships these files, a commit runs none of the shared jobs. `lefthook.test.ts` pins both paths and checks that the package ships them, and renaming one is a breaking change. CI's gitleaks scan still catches a secret the hook missed.
- Open: does each repo also guard against a missing shared file in its own `lefthook.yml`? One way is a `gitleaks` job with the same command, which merges with the shared one and still runs without it (`lefthook.test.ts`). The other is a job that runs `test -f node_modules/@rrlab/cli/lefthook/base.yml`, which covers every shared job. Until that is decided, dx's `lefthook.yml` holds only the two `extends` lines.
- A repo changes a shared job from a file it lists after the shared ones in `extends`. A repo whose type checker also reads `.astro`, for one, sets the `tsc` job's glob there, which keeps a single type check per commit.
