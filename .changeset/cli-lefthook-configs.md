---
"@rrlab/cli": minor
---

`@rrlab/cli` ships two lefthook configs for a repo to extend. `lefthook/base.yml` runs `rr jsc --fix-staged`, `rr tsc` and gitleaks over the staged changes on each commit, and `lefthook/turborepo.yml` runs the affected packages' tests on each push.
