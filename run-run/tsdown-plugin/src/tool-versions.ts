export const TOOL_VERSIONS = {
  // `install` is the prescriptive pin used by `rr plugins add`'s nypm call.
  // The looser contracts live in package.json#peerDependencies. typescript is
  // installed only where the package has none, so it keeps the range the ts or
  // astro plugin wrote. It stays on 6: with TypeScript 7, tsdown writes
  // declarations with tsgo, which needs a tsconfig.json this plugin doesn't
  // write (decisions/018).
  tsdown: { install: "^0.23.0" },
  typescript: { install: "^6.0.0" },
} as const;
