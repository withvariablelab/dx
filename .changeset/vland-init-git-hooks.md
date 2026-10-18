---
"@variablelab/vland": patch
---

`vland init` runs `git init` before installing dependencies, so the git hooks a dependency sets up on install (the templates' lefthook ones) land in the new repo. Before, the install ran first, found no repo and skipped them, so a generated project's `lefthook.yml` never ran until a manual `lefthook install`. The first commit skips those hooks, because it's the template as generated.
