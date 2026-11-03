import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

const { exports } = JSON.parse(readFileSync(path.join(PKG_DIR, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};
const PRESETS = Object.keys(exports).map((subpath) => `@rrlab/ts-config${subpath.slice(1)}`);

const COMPILERS = ["typescript", "typescript-5.4"].map((name) => {
  const manifestPath = require.resolve(`${name}/package.json`);
  const { version, bin } = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string; bin: { tsc: string } };
  return { version, tsc: path.join(path.dirname(manifestPath), bin.tsc) };
});

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function project(preset: string, source: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "rr-ts-config-"));
  tmpDirs.push(dir);
  mkdirSync(path.join(dir, "src"));
  mkdirSync(path.join(dir, "node_modules/@rrlab"), { recursive: true });
  mkdirSync(path.join(dir, "node_modules/@types"), { recursive: true });
  symlinkSync(PKG_DIR, path.join(dir, "node_modules/@rrlab/ts-config"), "dir");
  symlinkSync(path.dirname(require.resolve("@types/node/package.json")), path.join(dir, "node_modules/@types/node"), "dir");
  writeFileSync(path.join(dir, "tsconfig.json"), `${JSON.stringify({ extends: preset, include: ["src"] })}\n`);
  writeFileSync(path.join(dir, "src/index.ts"), source);
  return dir;
}

describe.each(COMPILERS)("the presets on TypeScript $version", ({ tsc }) => {
  const typecheck = (dir: string) => spawnSync(process.execPath, [tsc, "--noEmit", "-p", dir], { encoding: "utf8" });

  it.each(PRESETS)("%s type checks a clean file", (preset) => {
    const result = typecheck(project(preset, "export const answer: number = 42;\n"));
    expect(result.stdout + result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it.each(PRESETS)("%s reports a type error", (preset) => {
    const result = typecheck(project(preset, 'export const answer: number = "forty-two";\n'));
    expect(result.stdout).toContain("TS2322");
    expect(result.status).not.toBe(0);
  });
});
