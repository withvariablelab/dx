---
"@rrlab/cli": patch
---

`rr clean` deletes what it finds with Node's `fs.rm` instead of rimraf, which takes rimraf's glob 13 and minimatch 10, and their security advisories, out of `@rrlab/cli`'s dependencies.
