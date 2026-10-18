---
"@variablelab/vland": patch
---

`vland init` makes the first commit as your own git identity, the `user.name` and `user.email` git resolves for the new repo. Before, it always committed as `vland <noreply@variable.land>`, so the commit wasn't yours and a signed one showed as "Unverified" on GitHub. It still falls back to `vland` and `noreply@variable.land` for whichever of the two git has no value for.
