export const TOOL_VERSIONS = {
  // `install` is the prescriptive pin used by `rr plugins add`'s nypm call.
  // The looser `>=3.0.0` contract lives in package.json#peerDependencies.
  vitest: { install: "^5.0.0" },
} as const;
