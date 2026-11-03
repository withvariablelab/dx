# 011: How should bumps of `@rrlab/cli` propagate to the 5 official plugins via Changesets?

- **Date**: 2026-05-21
- **Amended**: 2026-10-17 — Changesets 3 bumps peer dependents by `patch`, so a CLI major lists the plugins as `major` explicitly (dx#263)
- **Status**: Applied
- **Files affected**: `.changeset/config.json`, `run-run/{biome,oxc,ts,tsdown,vitest}-plugin/package.json` (peer range), `.changeset/plugin-only-narrowing.md` (CLI bump escalated to major)

## Context

The 5 official plugins declare `@rrlab/cli` as a `peerDependency`. With Changesets 2's defaults (`onlyUpdatePeerDependentsWhenOutOfRange: false`), any non-`patch` bump of a peer automatically promoted its dependents to `major` — that lived in `@changesets/assemble-release-plan` `determine-dependents.ts#shouldBumpMajor`. The result was that even a routine `minor` to `@rrlab/cli` cascaded into plugin majors, which doesn't reflect the actual contract: a minor or patch of the kernel never breaks the plugin SDK.

The default is also entangled with the `workspace:*` range, which Changesets resolves to the _exact_ old version when reading the peer range, so the "is the new version still in range?" check would always fail anyway.

Changesets 3 (adopted in dx#263) changed the cascade itself: a peer dependent is now bumped by `patch` whatever the peer's bump, so a CLI major no longer turns into plugin majors on its own.

## Options considered

- **A**: Move `@rrlab/cli` out of `peerDependencies` into `dependencies` in each plugin. With `updateInternalDependencies: "patch"`, any CLI bump becomes a plugin patch automatically. Loses the peer contract (each plugin would carry its own copy in installs that don't deduplicate).
- **B**: Bump `@rrlab/cli` to `1.0.0`, switch the plugin peer range to `workspace:^` (publishes as `^<cli-version>`), and turn on the experimental `onlyUpdatePeerDependentsWhenOutOfRange: true`. CLI minors land in-range and stop propagating to the plugins; CLI majors escape `^1.x.y`.
- **C**: Replace `workspace:*` with a literal manual range (`>=0.0.0 <2.0.0`) in each plugin's peer, then enable `onlyUpdatePeerDependentsWhenOutOfRange: true`. Works pre-1.0, but the range is maintained by hand.

## Decision: Option B

- `1.0.0` is honest about where the contract sits. The declarative-plugin-shape change in this PR is itself a breaking edit to the kernel↔plugin SDK, so the CLI exiting `0.x` here is congruent with the change, not a marketing decision.
- `workspace:^` + `onlyUpdatePeerDependentsWhenOutOfRange: true` is the smallest delta that gives the desired semantics for patches and minors: the plugins stay as-is. Both knobs are still supported by Changesets 3 — no fork, no custom tooling.
- The plugin contract being kernel-internal (per `CLAUDE.md`) means the only consumers of the peer relationship are the 5 official plugins; we can keep the peer-vs-dependency distinction because pnpm + workspaces makes both resolve to the same workspace package.
- **Rule for CLI majors (since Changesets 3):** a changeset that bumps `@rrlab/cli` by `major` also lists every official plugin as `major`. Changesets 3 would give them only a `patch`, yet `workspace:^` publishes their peer as `^2.0.0`: a plugin _patch_ would raise its peer from `^1` to `^2`, and a host on `@rrlab/cli` `^1` taking that caret update gets an unmet peer (npm `ERESOLVE`). No config key restores the Changesets 2 cascade.

```md
---
"@rrlab/cli": major
"@rrlab/biome-plugin": major
"@rrlab/oxc-plugin": major
"@rrlab/ts-plugin": major
"@rrlab/tsdown-plugin": major
"@rrlab/vitest-plugin": major
---
```

Resulting matrix once on 1.x, with Changesets 3:

| CLI bump                | Effect on plugins                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patch` `1.0.0 → 1.0.1` | no bump — `^1.0.0` still satisfies                                                                                                                                                        |
| `minor` `1.0.0 → 1.1.0` | no bump — `^1.0.0` still satisfies, so the out-of-range check fails                                                                                                                       |
| `major` `1.0.0 → 2.0.0` | Changesets alone gives the plugins a `patch` (Changesets 2 gave a `major`); the changeset lists them as `major` explicitly, per the rule above, because the contract is actually breaking |

## Alternatives rejected

- Option A: drops the peer semantics. The plugins genuinely couple to the kernel SDK; expressing that as `dependencies` would model the relationship incorrectly and lose `peerDependencies`' duplicate-detection guarantees for hosts.
- Option C: works, but introduces a manually-maintained range string per plugin. Option B uses `workspace:^` which Changesets already resolves at publish-time, so no per-release upkeep.

## Notes for human review

- `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH` is the actual config key — its name advertises that the API may change in a future patch release. Changesets 3 keeps it (it is in the `@changesets/config@4.0.1` schema). If Changesets renames it, the migration is mechanical.
- `updateInternalDependents` (the sibling experimental key) is left at the default `"out-of-range"`. With `workspace:^`, in-range CLI bumps publish no new plugin tarballs at all, which is the intended low-churn behaviour. Flipping it to `"always"` would force a plugin patch on every CLI release.
- For _this_ PR specifically the plugins still publish as `1.0.0` because the changeset declares them `major` explicitly (the declarative-plugin-shape change is breaking for plugin authors), not because the cascade promoted them.
- Changesets 3 behavior was checked by simulation on dx#263: a `patch` on `@rrlab/cli` bumped only the CLI; a `major` gave the plugins `1.1.4 → 1.1.5` (`vitest-plugin` `0.1.3 → 0.1.4`), where Changesets 2.29.8 gave `2.0.0` (`vitest-plugin` `1.0.0`). Enforcing the rule automatically (a check that a CLI major changeset lists every plugin) is tracked in dx#262.
