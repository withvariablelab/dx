---
"@rrlab/tsdown-plugin": minor
---

`rr plugins add tsdown` installs tsdown 0.23 (`tsdown@^0.23.0`), and the `typescript` it adds where the package has none stays `^6.0.0`, since on TypeScript 7 tsdown writes declarations only in a package with a `tsconfig.json`.
