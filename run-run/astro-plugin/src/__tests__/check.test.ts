import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createShellService } from "@variablelab/clibuddy";
import { satisfies } from "semver";
import { afterEach, describe, expect, it } from "vitest";
import { AstroCheckService } from "../index.ts";

// These run the real `astro check` against a tmp Astro project, so they are slow.
const TIMEOUT = 60_000;
const PLUGIN_NODE_MODULES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../node_modules");

// astro refuses to start on a Node older than its own `engines.node` (astro 7 needs a
// newer one than this repo's floor), so the tests that run it are skipped there. The
// missing-dependency tests never start astro, so they run everywhere.
const astroPkg = JSON.parse(readFileSync(path.join(PLUGIN_NODE_MODULES, "astro/package.json"), "utf8")) as {
  engines: { node: string };
};
const ASTRO_RUNS = satisfies(process.versions.node, astroPkg.engines.node);

const CLEAN_PAGE = `---\nconst answer: number = 42;\n---\n<p>{answer}</p>\n`;
const BROKEN_PAGE = `---\nconst answer: number = "forty-two";\n---\n<p>{answer}</p>\n`;
const CLEAN_TS = "export const ok: number = 1;\n";
const BROKEN_TS = 'export const bad: number = "not a number";\n';

let tmpDir: string | undefined;

afterEach(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
});

/**
 * A minimal Astro project shaped like www (the `astro/tsconfigs/strict` preset,
 * `.astro/types.d.ts` included). Its node_modules links the given packages from
 * this plugin's own devDependencies, so `astro check` resolves them from the
 * project root as it would in a host project.
 */
async function makeProject(files: Record<string, string>, deps = ["astro", "@astrojs/check", "typescript"]) {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rr-astro-plugin-"));
  const all = {
    "package.json": `${JSON.stringify({ name: "astro-fixture", private: true, type: "module" })}\n`,
    "tsconfig.json": `${JSON.stringify({ extends: "astro/tsconfigs/strict", include: [".astro/types.d.ts", "**/*"] })}\n`,
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  }
  for (const dep of deps) {
    const link = path.join(tmpDir, "node_modules", dep);
    await fs.mkdir(path.dirname(link), { recursive: true });
    await fs.symlink(await fs.realpath(path.join(PLUGIN_NODE_MODULES, dep)), link, "dir");
  }
  return tmpDir;
}

function service(cwd: string) {
  return new AstroCheckService(createShellService({ cwd }), cwd);
}

describe("AstroCheckService.check()", () => {
  it.runIf(ASTRO_RUNS)(
    "passes on a project without type errors",
    async () => {
      const cwd = await makeProject({ "src/pages/index.astro": CLEAN_PAGE, "src/lib/ok.ts": CLEAN_TS });
      const report = await service(cwd).check({ cwd });
      expect(report.ok, report.output).toBe(true);
      expect(report.output).toContain("$ astro check");
    },
    TIMEOUT,
  );

  it.runIf(ASTRO_RUNS)(
    "fails with astro check's diagnostic for a type error in a .astro file",
    async () => {
      const cwd = await makeProject({ "src/pages/index.astro": BROKEN_PAGE, "src/lib/ok.ts": CLEAN_TS });
      const report = await service(cwd).check({ cwd });
      expect(report.ok).toBe(false);
      expect(report.output).toContain("src/pages/index.astro");
      expect(report.output).toMatch(/Type 'string' is not assignable to type 'number'/);
    },
    TIMEOUT,
  );

  it.runIf(ASTRO_RUNS)(
    "fails for a type error in a plain .ts file too",
    async () => {
      const cwd = await makeProject({ "src/pages/index.astro": CLEAN_PAGE, "src/lib/bad.ts": BROKEN_TS });
      const report = await service(cwd).check({ cwd });
      expect(report.ok).toBe(false);
      expect(report.output).toContain("src/lib/bad.ts");
      expect(report.output).toMatch(/Type 'string' is not assignable to type 'number'/);
    },
    TIMEOUT,
  );

  it("fails without running astro when @astrojs/check is missing", async () => {
    // Left to itself, astro would prompt to install it: a hang under capture, a false pass without stdin.
    const cwd = await makeProject({ "src/pages/index.astro": BROKEN_PAGE }, ["astro", "typescript"]);
    const report = await service(cwd).check({ cwd });
    expect(report.ok).toBe(false);
    expect(report.output).not.toContain("$ astro check");
    expect(report.output).toMatchInlineSnapshot(
      `"@rrlab/astro-plugin requires @astrojs/check to be installed in the host project. Run: rr plugins add astro  (or: pnpm add -D @astrojs/check)"`,
    );
  });
});

describe("AstroCheckService.doctor()", () => {
  it.runIf(ASTRO_RUNS)("reports healthy when astro check's dependencies resolve", async () => {
    const cwd = await makeProject({});
    const report = await service(cwd).doctor();
    expect(report.ok, report.output).toBe(true);
  });

  it("fails when they don't", async () => {
    const cwd = await makeProject({}, ["astro"]);
    const report = await service(cwd).doctor();
    expect(report.ok).toBe(false);
    expect(report.output).toContain("requires @astrojs/check, typescript to be installed");
  });
});
