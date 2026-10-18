---
"@rrlab/cli": patch
---

`rr plugins add` without a terminal (an agent, a script, CI) takes the defaults, as with `--yes`, instead of prompting: it used to wait on the prompt, or exit 13 with the plugin half installed. `rr plugins remove` without a terminal and without `--yes` stops with an error that asks for `--yes`, since it deletes files and dependencies. Both count as a terminal only when stdin and stdout are TTYs.
