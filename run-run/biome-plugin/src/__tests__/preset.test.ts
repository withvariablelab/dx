import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const preset = createRequire(import.meta.url)("@rrlab/biome-config") as { linter?: { rules?: object } };

describe("@rrlab/biome-config, the preset that install() extends", () => {
  it("names no schema version, which Biome would compare with the installed one", () => {
    expect(preset).not.toHaveProperty("$schema");
  });

  it("leaves the recommended rules to Biome's default instead of the field Biome 2.6 deprecates", () => {
    expect(preset.linter?.rules).not.toHaveProperty("recommended");
  });
});
