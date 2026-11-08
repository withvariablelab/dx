import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE_DIR = realpathSync(path.join(PKG_DIR, "node_modules/@total-typescript/tsconfig"));

const { exports } = JSON.parse(readFileSync(path.join(PKG_DIR, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};
const PRESETS = Object.keys(exports).map((subpath) => `@rrlab/ts-config${subpath.slice(1)}`);

const SOURCE = 'import { unused } from "./unused";\nexport const answer: number = 42;\n';
const TRANSFORM_SCRIPT = `import { transformWithOxc } from "vite";
const { code } = await transformWithOxc(${JSON.stringify(SOURCE)}, process.argv[1]);
process.stdout.write(code);
`;

const workDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "rr-ts-config-packed-")));
const unpackedDir = path.join(workDir, "unpacked");

beforeAll(() => {
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

function project(preset: string): string {
  const dir = mkdtempSync(path.join(workDir, "project-"));
  const store = path.join(dir, "node_modules/.pnpm/@rrlab+ts-config@0.0.0/node_modules");
  cpSync(path.join(unpackedDir, "package"), path.join(store, "@rrlab/ts-config"), { recursive: true });
  mkdirSync(path.join(store, "@total-typescript"));
  symlinkSync(BASE_DIR, path.join(store, "@total-typescript/tsconfig"), "dir");
  mkdirSync(path.join(dir, "node_modules/@rrlab"));
  symlinkSync(path.join(store, "@rrlab/ts-config"), path.join(dir, "node_modules/@rrlab/ts-config"), "dir");
  writeFileSync(path.join(dir, "tsconfig.json"), `${JSON.stringify({ extends: preset })}\n`);
  return dir;
}

function transform(file: string) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", TRANSFORM_SCRIPT, file], {
    cwd: PKG_DIR,
    encoding: "utf8",
    env: { ...process.env, NODE_PATH: undefined },
  });
}

describe("the packed presets in pnpm's isolated layout", () => {
  it.each(PRESETS)("%s keeps its base's verbatimModuleSyntax in Vite run from plain node", (preset) => {
    const result = transform(path.join(project(preset), "src/index.ts"));
    expect(result.stdout + result.stderr).toBe('import { unused } from "./unused";\nexport const answer = 42;\n');
    expect(result.status).toBe(0);
  });
});
