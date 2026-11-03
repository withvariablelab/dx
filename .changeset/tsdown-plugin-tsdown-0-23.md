---
"@rrlab/tsdown-plugin": minor
---

`rr plugins add tsdown` installs tsdown 0.23 (`tsdown@^0.23.0`) and, where the package has no `typescript`, TypeScript 7 (`typescript@^7.0.0`), and for the `lib` build it now needs a `tsconfig.json` in the package or a folder above it, which `rr plugins add ts` writes: without one it stops before changing anything.
