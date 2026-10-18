---
"@rrlab/ts-plugin": patch
---

`rr plugins add ts` defaults to the React preset when the package depends on `react` (in `dependencies`, `devDependencies` or `peerDependencies`), and to the Node.js app preset otherwise. That's what `--yes` and a run without a terminal pick, and where the prompt starts. Before, they always picked the Node.js preset, which can't type-check a React app.
