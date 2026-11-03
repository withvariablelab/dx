---
"@rrlab/cli": patch
---

`@rrlab/cli` depends on nypm 0.6.12, lilconfig 3.1.4, commander 15, whose "too many arguments" error now lists the extra arguments, and glob 14, which `rr clean` uses to find what it deletes as well as what `--dry-run` lists, and no longer on memoize, which it never imported.
