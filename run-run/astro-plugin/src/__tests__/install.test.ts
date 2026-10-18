import type { InstallContext, UninstallContext } from "@rrlab/cli/plugin";
import { describe, expect, it } from "vitest";
import { install, TOOL_VERSIONS, uninstall } from "../index.ts";

// The astro plugin scaffolds no config (an Astro project already has its
// tsconfig.json): install/uninstall only add/remove what `astro check` needs.
// The hooks ignore their context, so a bare cast is enough at the test boundary.
const noopInstallCtx = {} as InstallContext;
const noopUninstallCtx = {} as UninstallContext;

describe("@rrlab/astro-plugin install()", () => {
  it("adds @astrojs/check and typescript as devDependencies and scaffolds no files", async () => {
    const result = await install(noopInstallCtx);
    expect(result.devDependencies).toEqual({
      "@astrojs/check": TOOL_VERSIONS["@astrojs/check"].install,
      typescript: TOOL_VERSIONS.typescript.install,
    });
    expect(result.files).toBeUndefined();
  });

  it("leaves astro alone: the host project owns its framework version", async () => {
    const result = await install(noopInstallCtx);
    expect(result.devDependencies).not.toHaveProperty("astro");
  });
});

describe("@rrlab/astro-plugin uninstall()", () => {
  it("removes @astrojs/check and typescript and touches no files", async () => {
    const result = await uninstall(noopUninstallCtx);
    expect(result.removeDependencies).toEqual(["@astrojs/check", "typescript"]);
    expect(result.files).toBeUndefined();
  });
});
