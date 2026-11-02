---
"@rrlab/biome-config": patch
---

The preset no longer sets `$schema` or `linter.rules.recommended`, so Biome 2.6 stops printing a schema-version notice and a deprecation notice on every run, with the same rules on as before.
