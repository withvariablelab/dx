import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minVersion, satisfies, subset } from "semver";
import { describe, expect, it } from "vitest";
import { TOOL_VERSIONS } from "../tool-versions.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(here, "../../package.json"), "utf8")) as {
  peerDependencies?: Record<string, string>;
};

describe("TOOL_VERSIONS coherence with this plugin's package.json", () => {
  for (const [name, entry] of Object.entries(TOOL_VERSIONS)) {
    const peerRange = pkg.peerDependencies?.[name];
    if (!peerRange) continue;

    it(`${name}: install range fits within the declared peer range`, () => {
      const ok = subset(entry.install, peerRange) || satisfies(minVersion(entry.install)?.version ?? "", peerRange);
      expect(ok, `install=${entry.install} does not fit peer=${peerRange}`).toBe(true);
    });
  }
});
