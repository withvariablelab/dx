export const TOOL_VERSIONS = {
  // `install` is the prescriptive pin used by `rr plugins add`'s nypm call.
  // The looser contracts live in package.json#peerDependencies. `astro` itself
  // isn't here: the host project owns its framework version.
  "@astrojs/check": { install: "^0.9.10" },
  typescript: { install: "^6.0.0" },
} as const;
