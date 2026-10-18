---
"@rrlab/oxc-plugin": patch
---

`rr lint`, `rr jsc` and `rr check` run `oxlint` without `--check`, a flag it doesn't have, so they failed wherever oxc provides `lint`. `rr format --fix` runs `oxfmt --write`, since `oxfmt` has no `--fix` either.
