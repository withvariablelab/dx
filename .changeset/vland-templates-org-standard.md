---
"@variablelab/vland": minor
---

Projects from `vland init` follow Variable Lab's current standard:

- mise pins Node.js 24 and pnpm 10.30.3, with a `mise.lock` that needs mise 2026.9.16 or later. `.node-version` is gone.
- `engines.node` is `>=22.18.0`, the first Node.js that strips types without a flag, which `rr` needs to load `run-run.config.mts`.
- CI sets up with `jdx/mise-action` and runs `rr check`. Every action is pinned by SHA, checkout keeps no credentials, and a new `workflow-audit.yml` runs zizmor. The monorepo gets a CI workflow, which tests and builds only what a PR affects.
- Changesets 3, with `commit: true` and `format: false`. The library's release workflow runs `changesets/action` v2 as vland-bot, so its repo needs the `VLAND_BOT_CLIENT_ID` variable and the `VLAND_BOT_PRIVATE_KEY` secret.
- The changelog links to `withvariablelab/<name>` for a public library and `variableland/<name>` otherwise, not `<name>/<name>`.
- pnpm waits a day before installing a new release, and runs lefthook's postinstall on every install, so the git hooks get installed.
- `@rrlab/cli` is `^1.3.4`. The `^0.1.0` the templates asked for doesn't exist, so `pnpm install` failed.
- The backend's `pnpm dev` runs `node --watch` and loads `.env`, without `tsx`.
- The library's published `exports` point at what `rr pack` builds (`index.mjs` and `index.d.mts`), and its README at the scoped package name.
- Every generated file passes both oxfmt and Biome (with `@rrlab/biome-config`), including `package.json` key order with `private` after `version`, so `rr check` starts green with either. The READMEs explain how to pair the oxc plugin with `ts`.
