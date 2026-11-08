---
"@rrlab/ts-config": patch
---

`@rrlab/ts-config` bundles `@total-typescript/tsconfig`, the base its presets extend, so Vite 8 run from plain `node` finds that base through pnpm's symlink instead of failing every transform with `Failed to load tsconfig '@total-typescript/tsconfig/bundler/dom'`.
