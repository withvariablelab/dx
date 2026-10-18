---
"@rrlab/astro-plugin": minor
"@rrlab/cli": minor
---

Add `@rrlab/astro-plugin`, which provides the `typecheck` capability through `astro check`.

In an Astro project, `rr tsc` and `rr check` now type-check `.astro` files along with the rest of the project, so they replace a separate `astro check` step. `rr plugins add astro` installs it.
