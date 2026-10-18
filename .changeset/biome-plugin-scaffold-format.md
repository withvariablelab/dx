---
"@rrlab/biome-plugin": patch
---

`rr plugins add biome` scaffolds a `biome.json` that passes `rr jsc`: in Biome's own format, with `$schema` pointing at the installed Biome's schema (`./node_modules/@biomejs/biome/configuration_schema.json`). It used to fail the format check, and its pinned 2.4.4 schema URL drew a version-mismatch note against the `^2.0.0` it installs.
