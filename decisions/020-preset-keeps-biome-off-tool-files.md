# 020: How does `@rrlab/biome-config` keep Biome off the files other tools write?

- **Date**: 2026-11-03
- **Status**: Applied
- **Files affected**: `run-run/biome-config/src/config.json`, `run-run/biome-config/package.json`, `run-run/biome-plugin/package.json`, `run-run/biome-plugin/src/__tests__/preset.test.ts`, `biome.json`

## Context

The maintainer moved into the preset what every repo using it repeated in its own `biome.json`: the Markdown settings, and the paths Biome must leave alone because another tool writes them (`.mise/locks/`, `.changeset/*.md`, `CHANGELOG.md`, `.github/workflows/pullfrog.yml`). Each repo listed those paths as `files.includes: ["**", "!…"]`. Biome combines list entries across `extends`, the extending file last, so whatever the preset adds meets each repo's own list.

## Options considered

- **A**: `files.includes: ["**", "!.mise/locks", …]` in the preset.
- **B**: an `overrides` entry in the preset that turns the formatter, linter and assist off for those paths.

## Decision: Option B

`arch-critic` recommended B on 2026-11-03, from a spike on Biome 2.6.4 with an unformatted file at each path. With B, the paths are left alone beside a repo's `["**", "!dist"]`, beside a narrow `["src/**"]` (which stays narrow), with no list at all, and beside a repo's own `overrides`. A missing path raises no error, and a repo's later override can turn a tool back on for one of them. A repo can drop its own copies whenever it likes, since a leftover copy only repeats the preset. `pnpm-lock.yaml` is in neither list: Biome 2.6.4 never processed it, even with nothing excluding it.

## Alternatives rejected

- Option A: in a repo whose list starts with `"**"`, `noBiomeFirstException` (recommended, an error) fires, and the repo's `"**"`, coming after the preset's exclusions, brings the paths back. A `["src/**"]` repo widens to every file. Every consumer would have to rewrite its list in the same upgrade.

## Notes for human review

- Biome still reads those files; it runs no tool on them. Inside `overrides`, a folder needs `/**` (`.mise/locks/**`).
- Both packages take a minor. biome-config adds settings and drops Biome 2.3 to 2.5, which load 0.0.7 but stop on the `markdown` key, and 0.1.0 also lets `^0.1.0` hosts take later patches. biome-plugin's code still runs on Biome 2.5: its peer rises only so `preset.test.ts`'s subset rule holds.
