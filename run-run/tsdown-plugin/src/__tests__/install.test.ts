import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type ClackPrompts, type InstallContext, ReleaseService, type UninstallContext } from "@rrlab/cli/plugin";
import type { Pkg, ShellService } from "@variablelab/clibuddy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { install, TOOL_VERSIONS, uninstall } from "../index.ts";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rr-tsdown-plugin-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function appPkg(packageJson: Pkg["packageJson"] = {}): Pkg {
  return { dirPath: tmpDir, packageJson } as Pkg;
}

function installCtx(overrides: Partial<InstallContext> = {}): InstallContext {
  return {
    shell: {} as ShellService,
    // biome-ignore lint/suspicious/noExplicitAny: minimal stub for the test boundary
    logger: {} as any,
    appPkg: appPkg(),
    prompts: stubPrompts(),
    flags: { force: false, yes: true, nonInteractive: true },
    release: new ReleaseService(undefined),
    ...overrides,
  };
}

function uninstallCtx(overrides: Partial<UninstallContext> = {}): UninstallContext {
  return {
    shell: {} as ShellService,
    // biome-ignore lint/suspicious/noExplicitAny: minimal stub
    logger: {} as any,
    appPkg: appPkg(),
    prompts: stubPrompts(),
    flags: { yes: true, nonInteractive: true },
    ...overrides,
  };
}

function stubPrompts(overrides: Partial<ClackPrompts> = {}): ClackPrompts {
  const cancelSymbol = Symbol("clack:cancel");
  return {
    select: vi.fn(async (_opts) => "lib" as unknown) as unknown as ClackPrompts["select"],
    confirm: vi.fn(async () => true),
    isCancel: (value): value is symbol => value === cancelSymbol,
    ...overrides,
  };
}

describe("@rrlab/tsdown-plugin install()", () => {
  // The lib build needs one; the "tsconfig.json" cases below remove it.
  beforeEach(async () => {
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}\n");
  });

  describe("non-interactive (--yes / nonInteractive)", () => {
    it("creates tsdown.config.ts with the default preset (lib) when no file exists", async () => {
      const result = await install(installCtx());
      expect(result.devDependencies).toEqual({
        tsdown: expect.stringMatching(/\^?\d/),
        typescript: TOOL_VERSIONS.typescript.install,
        "@rrlab/tsdown-config": "latest",
      });
      expect(result.files).toHaveLength(1);
      const op = result.files?.[0];
      if (op?.kind !== "create") throw new Error("expected create op");
      expect(op.path).toBe("tsdown.config.ts");
      expect(op.content).toContain(`import { defineLibConfig } from "@rrlab/tsdown-config"`);
      expect(op.content).toContain("export default defineLibConfig();");
    });

    it("skips (only emits the tool deps) when a config file already exists", async () => {
      // Under --yes, we don't silently rewrite user code.
      await fs.writeFile(
        path.join(tmpDir, "tsdown.config.ts"),
        'import { defineConfig } from "tsdown";\nexport default defineConfig({});\n',
      );
      const result = await install(installCtx());
      expect(result.devDependencies).toEqual({
        tsdown: expect.any(String),
        typescript: TOOL_VERSIONS.typescript.install,
      });
      expect(result.files).toBeUndefined();
    });
  });

  describe("interactive — no existing file", () => {
    it("asks confirm; user can decline", async () => {
      const confirm = vi.fn(async () => false);
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ confirm }),
        }),
      );
      expect(confirm).toHaveBeenCalledOnce();
      expect(result.devDependencies).toEqual({
        tsdown: expect.any(String),
        typescript: TOOL_VERSIONS.typescript.install,
      });
      expect(result.files).toBeUndefined();
    });

    it("scaffolds with `bin` preset when the user picks it", async () => {
      const select = vi.fn(async () => "bin" as unknown) as unknown as ClackPrompts["select"];
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select }),
        }),
      );
      const op = result.files?.[0];
      if (op?.kind !== "create") throw new Error("expected create op");
      expect(op.content).toContain("defineBinConfig");
      expect(op.content).not.toContain("defineLibConfig");
    });
  });

  describe("interactive — existing file", () => {
    it("offers a 3-way choice and patches the existing file when user picks patch", async () => {
      await fs.writeFile(
        path.join(tmpDir, "tsdown.config.ts"),
        'import { defineConfig } from "tsdown";\nexport default defineConfig({ entry: ["src/lib.ts"] });\n',
      );
      // First select: action (patch). Second select: preset (lib).
      const select = vi.fn();
      select.mockResolvedValueOnce("patch");
      select.mockResolvedValueOnce("lib");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      expect(select).toHaveBeenCalledTimes(2);
      const op = result.files?.[0];
      if (op?.kind !== "edit-text") throw new Error("expected edit-text op");
      const input = await fs.readFile(path.join(tmpDir, "tsdown.config.ts"), "utf8");
      expect(op.edit(input)).toBe(
        `import { defineLibConfig } from "@rrlab/tsdown-config";\nexport default defineLibConfig({ entry: ["src/lib.ts"] });`,
      );
    });

    it("patches a .mjs config file by extension", async () => {
      await fs.writeFile(
        path.join(tmpDir, "tsdown.config.mjs"),
        'import { defineConfig } from "tsdown";\nexport default defineConfig();\n',
      );
      const select = vi.fn();
      select.mockResolvedValueOnce("patch");
      select.mockResolvedValueOnce("lib");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      const op = result.files?.[0];
      if (op?.kind !== "edit-text") throw new Error("expected edit-text op");
      expect(op.path).toBe("tsdown.config.mjs");
    });

    it("emits a create op with overwrite when the user picks overwrite", async () => {
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), "// custom\n");
      const select = vi.fn();
      select.mockResolvedValueOnce("overwrite");
      select.mockResolvedValueOnce("lib");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      const op = result.files?.[0];
      if (op?.kind !== "create") throw new Error("expected create op");
      expect(op.overwrite).toBe(true);
      expect(op.content).toContain("defineLibConfig()");
    });

    it("returns no file ops when the user picks skip", async () => {
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), "// custom\n");
      const select = vi.fn();
      select.mockResolvedValueOnce("skip");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      expect(result.files).toBeUndefined();
      expect(result.devDependencies).toEqual({
        tsdown: expect.any(String),
        typescript: TOOL_VERSIONS.typescript.install,
      });
    });
  });

  describe("patchToFactory refusal", () => {
    it("throws when the default export is not a function call", async () => {
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), 'export default { entry: ["src/index.ts"] };\n');
      const select = vi.fn();
      select.mockResolvedValueOnce("patch");
      select.mockResolvedValueOnce("lib");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      const op = result.files?.[0];
      if (op?.kind !== "edit-text") throw new Error("expected edit-text op");
      const input = await fs.readFile(path.join(tmpDir, "tsdown.config.ts"), "utf8");
      expect(() => op.edit(input)).toThrowError(/not a direct function call/);
    });

    it("throws when the default export calls an unknown function", async () => {
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), "export default someOtherBuilder({ entry: [] });\n");
      const select = vi.fn();
      select.mockResolvedValueOnce("patch");
      select.mockResolvedValueOnce("lib");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      const op = result.files?.[0];
      if (op?.kind !== "edit-text") throw new Error("expected edit-text op");
      const input = await fs.readFile(path.join(tmpDir, "tsdown.config.ts"), "utf8");
      expect(() => op.edit(input)).toThrowError(/someOtherBuilder/);
    });
  });

  describe("typescript (the lib preset's declarations need it)", () => {
    it.each([
      ["dependencies", { dependencies: { typescript: "^7.0.2" } }],
      ["devDependencies", { devDependencies: { typescript: "~5.9.0" } }],
    ])("leaves typescript out when the package already has it in %s", async (_field, packageJson) => {
      const result = await install(installCtx({ appPkg: appPkg(packageJson) }));
      expect(result.devDependencies).not.toHaveProperty("typescript");
      expect(result.devDependencies).toHaveProperty("tsdown");
    });

    it("leaves typescript out on the skip path when the package already has it", async () => {
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), "// custom\n");
      const result = await install(installCtx({ appPkg: appPkg({ devDependencies: { typescript: "~5.9.0" } }) }));
      expect(result.devDependencies).toEqual({ tsdown: expect.any(String) });
    });

    it("still adds typescript when the package only declares it as a peer", async () => {
      // A peer isn't installed locally, and tsdown needs typescript installed to write declarations.
      const result = await install(installCtx({ appPkg: appPkg({ peerDependencies: { typescript: ">=5.0.0" } }) }));
      expect(result.devDependencies?.typescript).toBe(TOOL_VERSIONS.typescript.install);
    });
  });

  describe("tsconfig.json (tsdown writes TypeScript 7 declarations only from one)", () => {
    const interactive = { force: false, yes: false, nonInteractive: false };

    it("refuses the lib build when there is none in the package or a folder above it", async () => {
      await fs.rm(path.join(tmpDir, "tsconfig.json"));
      const result = install(installCtx());
      await expect(result).rejects.toThrow(`which need a tsconfig.json, and there is none in ${tmpDir} or a folder`);
      await expect(result).rejects.toThrow("Run `rr plugins add ts`, which writes one");
    });

    it("takes the one in a folder above the package, as tsdown does", async () => {
      const dirPath = path.join(tmpDir, "packages/lib");
      await fs.mkdir(dirPath, { recursive: true });
      const result = await install(installCtx({ appPkg: { dirPath, packageJson: {} } as Pkg }));
      expect(result.files?.[0]?.kind).toBe("create");
    });

    it("doesn't need one for the bin build, which writes no declarations", async () => {
      await fs.rm(path.join(tmpDir, "tsconfig.json"));
      const select = vi.fn(async () => "bin" as unknown) as unknown as ClackPrompts["select"];
      const result = await install(installCtx({ flags: interactive, prompts: stubPrompts({ select }) }));
      expect(result.files?.[0]?.kind).toBe("create");
    });

    it("doesn't check when the package keeps its own tsdown config", async () => {
      await fs.rm(path.join(tmpDir, "tsconfig.json"));
      await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), "// custom\n");
      const result = await install(installCtx());
      expect(result.files).toBeUndefined();
    });
  });

  describe("release-driven sibling resolution", () => {
    it("threads ctx.release.resolve into @rrlab/tsdown-config's install spec", async () => {
      const release = new ReleaseService("pr-226", { fetcher: async () => new Response("{}", { status: 200 }) });
      const result = await install(installCtx({ release }));
      expect(result.devDependencies?.["@rrlab/tsdown-config"]).toBe("pr-226");
    });
  });
});

describe("@rrlab/tsdown-plugin uninstall()", () => {
  it("returns removeDependencies and no file ops when no config file exists", async () => {
    const result = await uninstall(uninstallCtx());
    expect(result.removeDependencies).toEqual(["tsdown", "@rrlab/tsdown-config"]);
    expect(result.files).toBeUndefined();
  });

  it("emits a delete op when the file is a pure scaffold (no args)", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tsdown.config.ts"),
      'import { defineLibConfig } from "@rrlab/tsdown-config";\n\nexport default defineLibConfig();\n',
    );
    const result = await uninstall(uninstallCtx());
    const op = result.files?.[0];
    if (op?.kind !== "delete") throw new Error("expected delete op");
    expect(op.path).toBe("tsdown.config.ts");
  });

  it("patches back to defineConfig from tsdown when the scaffold has user args", async () => {
    const original =
      'import { defineLibConfig } from "@rrlab/tsdown-config";\n\nexport default defineLibConfig({ entry: ["src/lib.ts"] });\n';
    await fs.writeFile(path.join(tmpDir, "tsdown.config.ts"), original);
    const result = await uninstall(uninstallCtx());
    const op = result.files?.[0];
    if (op?.kind !== "edit-text") throw new Error("expected edit-text op");
    expect(op.edit(original)).toBe(
      `import { defineConfig } from "tsdown";\n\nexport default defineConfig({ entry: ["src/lib.ts"] });`,
    );
  });

  it("leaves the file alone when it doesn't use our factories", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tsdown.config.ts"),
      'import { defineConfig } from "tsdown";\nexport default defineConfig({ entry: ["src/x.ts"] });\n',
    );
    const result = await uninstall(uninstallCtx());
    expect(result.removeDependencies).toEqual(["tsdown", "@rrlab/tsdown-config"]);
    expect(result.files).toBeUndefined();
  });

  it("leaves the file alone when our factory was imported from a different package", async () => {
    // Edge case: someone reused the name `defineLibConfig` from elsewhere.
    await fs.writeFile(
      path.join(tmpDir, "tsdown.config.ts"),
      'import { defineLibConfig } from "some-other-pkg";\n\nexport default defineLibConfig();\n',
    );
    const result = await uninstall(uninstallCtx());
    expect(result.files).toBeUndefined();
  });
});
