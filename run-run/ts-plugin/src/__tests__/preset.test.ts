import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { subset } from "semver";
import { describe, expect, it } from "vitest";

type Manifest = { peerDependencies?: Record<string, string> };

const require = createRequire(import.meta.url);
const readManifest = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Manifest;
const presetPkg = readManifest(path.resolve(path.dirname(require.resolve("@rrlab/ts-config/no-dom/app")), "../package.json"));
const pluginPkg = readManifest(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../package.json"));

describe("@rrlab/ts-config, the presets that install() extends", () => {
  it("accept every TypeScript the plugin's peer range allows", () => {
    const pluginRange = pluginPkg.peerDependencies?.typescript ?? "*";
    const presetRange = presetPkg.peerDependencies?.typescript ?? "*";
    expect(subset(pluginRange, presetRange), `peer ${pluginRange} is wider than the presets' ${presetRange}`).toBe(true);
  });
});
