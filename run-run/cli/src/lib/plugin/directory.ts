import type { PluginCapability } from "./types.ts";

type PluginInfo = {
  readonly pkg: string;
  readonly name: string;
  readonly capabilities: PluginCapability[];
};

export const PLUGINS_DIRECTORY = {
  ts: { pkg: "@rrlab/ts-plugin", name: "ts", capabilities: ["typecheck"] },
  biome: { pkg: "@rrlab/biome-plugin", name: "biome", capabilities: ["format", "jscheck", "lint"] },
  oxc: { pkg: "@rrlab/oxc-plugin", name: "oxc", capabilities: ["format", "lint", "jscheck", "typecheck"] },
  tsdown: { pkg: "@rrlab/tsdown-plugin", name: "tsdown", capabilities: ["pack"] },
  vitest: { pkg: "@rrlab/vitest-plugin", name: "vitest", capabilities: ["test"] },
  astro: { pkg: "@rrlab/astro-plugin", name: "astro", capabilities: ["typecheck"] },
} as const satisfies Record<string, PluginInfo>;

export type PluginName = keyof typeof PLUGINS_DIRECTORY;

export function allPluginNames(): readonly PluginName[] {
  return Object.keys(PLUGINS_DIRECTORY) as PluginName[];
}

export function isPluginName(name: string): name is PluginName {
  return Object.hasOwn(PLUGINS_DIRECTORY, name);
}

export function providersOf(capability: PluginCapability) {
  return Object.values(PLUGINS_DIRECTORY).filter((info: PluginInfo) => {
    return info.capabilities.includes(capability);
  });
}
