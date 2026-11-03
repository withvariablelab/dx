import { realpathSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type InstallContext, ReleaseService } from "@rrlab/cli/plugin";
import { createShellService, type Pkg, type ShellService } from "@variablelab/clibuddy";
import { satisfies } from "semver";
import { afterEach, describe, expect, it } from "vitest";
import { install, TOOL_VERSIONS, TsdownService } from "../index.ts";

const TIMEOUT = 60_000;
const PLUGIN_NODE_MODULES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../node_modules");
const tsdownRequire = createRequire(realpathSync(path.join(PLUGIN_NODE_MODULES, "tsdown/package.json")));
const BUILT_WITH = (tsdownRequire("typescript/package.json") as { version: string }).version;

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function scaffoldedPackage(source?: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rr-tsdown-plugin-pack-"));
  tmpDirs.push(dir);
  await fs.writeFile(path.join(dir, "tsconfig.json"), "{}\n");
  const result = await install({
    shell: {} as ShellService,
    logger: {} as InstallContext["logger"],
    appPkg: { dirPath: dir, packageJson: {} } as Pkg,
    prompts: {} as InstallContext["prompts"],
    flags: { force: false, yes: true, nonInteractive: true },
    release: new ReleaseService(undefined),
  });
  const op = result.files?.[0];
  if (op?.kind !== "create") throw new Error("expected create op");
  await fs.writeFile(path.join(dir, op.path), op.content);
  await fs.writeFile(path.join(dir, "package.json"), `${JSON.stringify({ name: "pack-fixture", type: "module" })}\n`);
  await fs.mkdir(path.join(dir, "src"));
  if (source) await fs.writeFile(path.join(dir, "src/index.ts"), source);
  await fs.mkdir(path.join(dir, "node_modules/@rrlab"), { recursive: true });
  await fs.symlink(
    await fs.realpath(path.join(PLUGIN_NODE_MODULES, "@rrlab/tsdown-config")),
    path.join(dir, "node_modules/@rrlab/tsdown-config"),
    "dir",
  );
  return dir;
}

function service(cwd: string) {
  return new TsdownService(createShellService({ cwd }));
}

describe("TsdownService.pack() on the lib scaffold", () => {
  it("builds with a TypeScript that install() pins", () => {
    expect(satisfies(BUILT_WITH, TOOL_VERSIONS.typescript.install), `typescript ${BUILT_WITH}`).toBe(true);
  });

  it(
    "writes the declarations in a package with a tsconfig.json",
    async () => {
      const dir = await scaffoldedPackage("export function answer(): number {\n  return 42;\n}\n");
      const report = await service(dir).pack();
      expect(report.ok, report.output).toBe(true);
      expect((await fs.readdir(path.join(dir, "dist"))).sort()).toEqual(["index.d.mts", "index.mjs"]);
    },
    TIMEOUT,
  );

  it(
    "fails when the entry is missing",
    async () => {
      const dir = await scaffoldedPackage();
      const report = await service(dir).pack();
      expect(report.ok).toBe(false);
    },
    TIMEOUT,
  );
});
