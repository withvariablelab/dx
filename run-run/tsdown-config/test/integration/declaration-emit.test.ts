import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as helpers from "../../src/index.ts";

const HELPERS = Object.keys(helpers);
const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSDOWN_DIR = realpathSync(path.join(PKG_DIR, "node_modules/tsdown"));
const require = createRequire(import.meta.url);

const TSC = (() => {
  const manifestPath = require.resolve("typescript/package.json");
  const { bin } = JSON.parse(readFileSync(manifestPath, "utf8")) as { bin: { tsc: string } };
  return path.join(path.dirname(manifestPath), bin.tsc);
})();

const BUNDLER_TSCONFIG = {
  compilerOptions: {
    target: "es2022",
    module: "preserve",
    moduleResolution: "bundler",
    strict: true,
    skipLibCheck: true,
    isolatedModules: true,
    verbatimModuleSyntax: true,
  },
};

const workDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "rr-tsdown-config-packed-")));
const unpackedDir = path.join(workDir, "unpacked");

beforeAll(() => {
  execFileSync("pnpm", ["build"], { cwd: PKG_DIR, stdio: "pipe" });
  const pack = execFileSync("pnpm", ["pack", "--json", "--pack-destination", workDir], {
    cwd: PKG_DIR,
    encoding: "utf8",
    stdio: "pipe",
  });
  const { filename } = JSON.parse(pack) as { filename: string };
  mkdirSync(unpackedDir);
  execFileSync("tar", ["-xzf", filename, "-C", unpackedDir]);
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function project(helper: string): string {
  const dir = mkdtempSync(path.join(workDir, "project-"));
  const store = path.join(dir, "node_modules/.pnpm/@rrlab+tsdown-config@0.0.0/node_modules");
  cpSync(path.join(unpackedDir, "package"), path.join(store, "@rrlab/tsdown-config"), { recursive: true });
  symlinkSync(TSDOWN_DIR, path.join(store, "tsdown"), "dir");
  mkdirSync(path.join(dir, "node_modules/@rrlab"));
  symlinkSync(path.join(store, "@rrlab/tsdown-config"), path.join(dir, "node_modules/@rrlab/tsdown-config"), "dir");
  symlinkSync(TSDOWN_DIR, path.join(dir, "node_modules/tsdown"), "dir");
  writeFileSync(path.join(dir, "tsconfig.json"), `${JSON.stringify(BUNDLER_TSCONFIG)}\n`);
  writeFileSync(
    path.join(dir, "tsdown.config.ts"),
    `import { ${helper} } from "@rrlab/tsdown-config";\n\nexport default ${helper}();\n`,
  );
  return dir;
}

function emitDeclarations(dir: string) {
  return spawnSync(
    process.execPath,
    [
      TSC,
      "--noEmit",
      "false",
      "--declaration",
      "--emitDeclarationOnly",
      "-p",
      path.join(dir, "tsconfig.json"),
      "--outDir",
      path.join(dir, "out"),
      "--rootDir",
      dir,
      "--noCheck",
    ],
    { encoding: "utf8" },
  );
}

describe("a tsdown.config.ts in pnpm's isolated layout", () => {
  it.each(HELPERS)("exports %s() as is and emits its declaration", (helper) => {
    const dir = project(helper);
    const result = emitDeclarations(dir);
    expect(result.stdout + result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readFileSync(path.join(dir, "out/tsdown.config.d.ts"), "utf8")).toBe(
      'declare const _default: import("@rrlab/tsdown-config").UserConfig;\nexport default _default;\n',
    );
  });
});
