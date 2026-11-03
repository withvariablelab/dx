import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { subset } from "semver";
import { describe, expect, it } from "vitest";

type Manifest = { peerDependencies?: Record<string, string> };

const require = createRequire(import.meta.url);
const preset = require("@rrlab/biome-config") as { linter?: { rules?: object } };
const readManifest = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Manifest;
const presetPkg = readManifest(path.resolve(path.dirname(require.resolve("@rrlab/biome-config")), "../package.json"));
const pluginPkg = readManifest(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../package.json"));

describe("@rrlab/biome-config, the preset that install() extends", () => {
  it("names no schema version, which Biome would compare with the installed one", () => {
    expect(preset).not.toHaveProperty("$schema");
  });

  it("leaves the recommended rules to Biome's default instead of the field Biome 2.6 deprecates", () => {
    expect(preset.linter?.rules).not.toHaveProperty("recommended");
  });

  it("loads on every Biome the plugin's peer range allows", () => {
    const pluginRange = pluginPkg.peerDependencies?.["@biomejs/biome"] ?? "*";
    const presetRange = presetPkg.peerDependencies?.["@biomejs/biome"] ?? "*";
    expect(subset(pluginRange, presetRange), `peer ${pluginRange} is wider than the preset's ${presetRange}`).toBe(true);
  });
});
