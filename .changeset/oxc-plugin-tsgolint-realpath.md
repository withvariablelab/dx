---
"@rrlab/oxc-plugin": patch
---

`rr plugins add oxc` installs `oxlint-tsgolint@^7.0.2004`, and the peer range now starts at `>=0.24.0`. `oxlint-tsgolint@0.23.0` bundles a typescript-go whose macOS `realpath` can fail under concurrency, so `rr tsc` reports random `TS2307` on installed modules ([microsoft/typescript-go#4060](https://github.com/microsoft/typescript-go/issues/4060)). The new install range also matches the `>=7.0.2003` peer that current `oxlint` requires.

`rr plugins add oxc` installs `oxfmt@^0.73.0`, and the peer range now starts at `>=0.67.0`. `oxfmt` up to 0.66.0 pins `tinypool@2.1.0`, which has two critical advisories ([GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)).

Both new peer floors exist only to warn about broken or vulnerable versions: if a project is still on `oxlint-tsgolint@0.23.0` or `oxfmt` below 0.67.0, pnpm warns about it when `@rrlab/oxc-plugin` is updated.
