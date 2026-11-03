export const TOOL_VERSIONS = {
  // `install` is the prescriptive pin used by `rr plugins add`'s nypm call.
  // For typescript we want fresh installs on the latest stable; the looser
  // contract lives in package.json#peerDependencies.
  typescript: { install: "^7.0.0" },
  "@types/node": { install: ">=20" },
} as const;
