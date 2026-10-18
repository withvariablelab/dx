import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type ClackPrompts, type InstallContext, ReleaseService, type UninstallContext } from "@rrlab/cli/plugin";
import type { Pkg, ShellService } from "@variablelab/clibuddy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { install, uninstall } from "../index.ts";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rr-ts-plugin-"));
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
    select: vi.fn(async (_opts) => "no-dom-lib" as unknown) as unknown as ClackPrompts["select"],
    confirm: vi.fn(async () => true),
    isCancel: (value): value is symbol => value === cancelSymbol,
    ...overrides,
  };
}

describe("@rrlab/ts-plugin install()", () => {
  describe("non-interactive (--yes / nonInteractive)", () => {
    it("creates tsconfig.json with the default preset (no-dom-app) when no file exists", async () => {
      const result = await install(installCtx());
      expect(result.devDependencies).toMatchObject({
        typescript: expect.stringMatching(/\^?\d/),
        "@rrlab/ts-config": "latest",
        "@types/node": expect.any(String), // no-dom preset → needs @types/node
      });
      expect(result.files).toHaveLength(1);
      const op = result.files?.[0];
      if (op?.kind !== "create") throw new Error("expected create op");
      const json = JSON.parse(op.content);
      expect(json.extends).toBe("@rrlab/ts-config/no-dom/app");
      // Minimalist wrapper: only `extends`, no include/exclude (preset provides them).
      expect(Object.keys(json)).toEqual(["extends"]);
    });

    it("emits an edit-json patch when the file already exists (preserves user keys)", async () => {
      await fs.writeFile(
        path.join(tmpDir, "tsconfig.json"),
        JSON.stringify({ extends: "@tsconfig/strictest/tsconfig.json", compilerOptions: { strict: true } }, null, 2),
      );
      const result = await install(installCtx());
      expect(result.files).toHaveLength(1);
      const op = result.files?.[0];
      if (op?.kind !== "edit-json") throw new Error("expected edit-json op");
      expect(op.edits).toEqual([{ op: "set", path: "/extends", value: "@rrlab/ts-config/no-dom/app", mode: "replace" }]);
    });
  });

  describe("interactive", () => {
    it("asks confirm when scaffolding a new file; user can decline", async () => {
      const confirm = vi.fn(async () => false);
      const result = await install(
        installCtx({ flags: { force: false, yes: false, nonInteractive: false }, prompts: stubPrompts({ confirm }) }),
      );
      expect(confirm).toHaveBeenCalledOnce();
      // Declined: only typescript, no @rrlab/ts-config (no scaffolding), no files.
      expect(result.devDependencies).toEqual({ typescript: expect.any(String) });
      expect(result.files).toBeUndefined();
    });

    it("offers a 3-way choice when the file exists", async () => {
      await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
      // First select: action (patch). Second select: preset (no-dom-app).
      const select = vi.fn();
      select.mockResolvedValueOnce("patch");
      select.mockResolvedValueOnce("no-dom-app");
      const result = await install(
        installCtx({
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select: select as unknown as ClackPrompts["select"] }),
        }),
      );
      expect(select).toHaveBeenCalledTimes(2);
      const op = result.files?.[0];
      if (op?.kind !== "edit-json") throw new Error("expected edit-json op");
    });
  });

  describe("default preset", () => {
    it.each([
      ["dependencies", { dependencies: { react: "^19.0.0" } }],
      ["peerDependencies", { peerDependencies: { react: ">=18" } }],
    ])("is the React preset when react is in %s", async (_field, packageJson) => {
      const result = await install(installCtx({ appPkg: appPkg(packageJson) }));
      const op = result.files?.[0];
      if (op?.kind !== "create") throw new Error("expected create op");
      expect(JSON.parse(op.content).extends).toBe("@rrlab/ts-config/react");
      expect(result.devDependencies).not.toHaveProperty("@types/node");
    });

    it("is where the interactive prompt starts", async () => {
      const select = vi.fn(async () => "react" as unknown) as unknown as ClackPrompts["select"];
      await install(
        installCtx({
          appPkg: appPkg({ devDependencies: { react: "^19.0.0" } }),
          flags: { force: false, yes: false, nonInteractive: false },
          prompts: stubPrompts({ select }),
        }),
      );
      expect(select).toHaveBeenCalledWith(expect.objectContaining({ initialValue: "react" }));
    });
  });

  describe("preset → devDeps", () => {
    it("omits @types/node for dom presets", async () => {
      const select = vi.fn(async () => "react" as unknown) as unknown as ClackPrompts["select"];
      const result = await install(
        installCtx({ flags: { force: false, yes: false, nonInteractive: false }, prompts: stubPrompts({ select }) }),
      );
      expect(result.devDependencies?.["@types/node"]).toBeUndefined();
      expect(result.devDependencies?.typescript).toBeDefined();
      expect(result.devDependencies?.["@rrlab/ts-config"]).toBeDefined();
    });

    it("includes @types/node for no-dom presets", async () => {
      const select = vi.fn(async () => "no-dom-lib" as unknown) as unknown as ClackPrompts["select"];
      const result = await install(
        installCtx({ flags: { force: false, yes: false, nonInteractive: false }, prompts: stubPrompts({ select }) }),
      );
      expect(result.devDependencies?.["@types/node"]).toBeDefined();
    });
  });

  describe("release-driven sibling resolution", () => {
    it("threads ctx.release.resolve into @rrlab/ts-config's install spec", async () => {
      const release = new ReleaseService("pr-226", { fetcher: async () => new Response("{}", { status: 200 }) });
      const result = await install(installCtx({ release }));
      expect(result.devDependencies?.["@rrlab/ts-config"]).toBe("pr-226");
    });
  });
});

describe("@rrlab/ts-plugin uninstall()", () => {
  it("returns removeDependencies and no file ops when tsconfig.json doesn't exist", async () => {
    const result = await uninstall(uninstallCtx());
    expect(result.removeDependencies).toEqual(["typescript", "@rrlab/ts-config", "@types/node"]);
    expect(result.files).toBeUndefined();
  });

  it("emits a delete op when tsconfig is just our wrapper", async () => {
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), JSON.stringify({ extends: "@rrlab/ts-config/no-dom/app" }, null, 2));
    const result = await uninstall(uninstallCtx());
    const op = result.files?.[0];
    if (op?.kind !== "delete") throw new Error("expected delete op");
    expect(op.path).toBe("tsconfig.json");
  });

  it("emits an unset edit when tsconfig has other meaningful settings", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      JSON.stringify({ extends: "@rrlab/ts-config/no-dom/app", compilerOptions: { strict: true } }, null, 2),
    );
    const result = await uninstall(uninstallCtx());
    const op = result.files?.[0];
    if (op?.kind !== "edit-json") throw new Error("expected edit-json op");
    expect(op.edits).toEqual([{ op: "unset", path: "/extends" }]);
  });
});
