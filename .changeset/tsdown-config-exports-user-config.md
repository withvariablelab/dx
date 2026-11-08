---
"@rrlab/tsdown-config": patch
---

`@rrlab/tsdown-config` exports tsdown's `UserConfig`, the type its helpers return, so a `tsdown.config.ts` that exports `defineLibConfig()` or `defineBinConfig()` as it is no longer fails TypeScript 7's declaration emit with `TS2883: The inferred type of 'default' cannot be named without a reference to 'UserConfig'`.
