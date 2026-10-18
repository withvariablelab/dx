---
"@rrlab/cli": patch
---

`rr plugins add` writes `run-run.config.mts` with its imports together, in Biome's order, and with a final newline, so `rr jsc` and oxfmt pass on it. Each new import used to go first, so they ended up in reverse order of adding, and the file had no final newline.
