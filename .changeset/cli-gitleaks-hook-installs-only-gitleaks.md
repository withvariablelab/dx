---
"@rrlab/cli": patch
---

The `gitleaks` job of `lefthook/base.yml` runs `mise exec gitleaks --` instead of `mise exec --`, so mise installs only the repo's pinned gitleaks when it is missing, and a tool of the global mise config that fails to install no longer blocks every commit.
