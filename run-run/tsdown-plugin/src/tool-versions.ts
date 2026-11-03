export const TOOL_VERSIONS = {
  // `install` is the prescriptive pin used by `rr plugins add`'s nypm call.
  // The looser contracts live in package.json#peerDependencies. typescript is
  // added only where the package has none (decisions/018).
  tsdown: { install: "^0.23.0" },
  typescript: { install: "^7.0.0" },
} as const;
