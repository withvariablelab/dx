import { defineConfig, type UserConfig } from "tsdown";

export type { UserConfig } from "tsdown";

export function defineBinConfig(options: UserConfig = {}) {
  return defineConfig({
    entry: ["src/run.ts"],
    format: "esm",
    platform: "node",
    ...options,
  });
}

export function defineLibConfig(options: UserConfig = {}) {
  return defineConfig({
    format: "esm",
    dts: true,
    entry: ["src/index.ts"],
    ...options,
  });
}
