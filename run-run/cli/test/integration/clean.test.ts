import { existsSync } from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestCli, fixtures, makeFixture } from "#test/helpers.ts";

const cli = createTestCli();

const FILES = [
  "dist/index.js",
  "packages/a/dist/index.js",
  "packages/a/src/index.ts",
  "node_modules/dep/dist/index.js",
  ".turbo/turbo-build.log",
  "pnpm-lock.yaml",
];

describe("rr clean", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeFixture(
      "clean",
      { "package.json": fixtures.pkg(), ...Object.fromEntries(FILES.map((file) => [file, ""])) },
      { linkNodeModules: false },
    );
  });

  afterEach(() => fixture.cleanup());

  const remaining = () => FILES.filter((file) => existsSync(path.join(fixture.dir, file)));

  test("--only-dist deletes every dist folder outside node_modules", () => {
    const r = cli("clean --only-dist", { cwd: fixture.dir });
    expect(r.status, r.stdout + r.stderr).toBe(0);

    expect(remaining()).toEqual([
      "packages/a/src/index.ts",
      "node_modules/dep/dist/index.js",
      ".turbo/turbo-build.log",
      "pnpm-lock.yaml",
    ]);
  });

  test("deletes dist, node_modules, .turbo and the lockfile, and keeps the sources", () => {
    const r = cli("clean", { cwd: fixture.dir });
    expect(r.status, r.stdout + r.stderr).toBe(0);

    expect(remaining()).toEqual(["packages/a/src/index.ts"]);
    expect(existsSync(path.join(fixture.dir, "package.json"))).toBe(true);
  });

  test("--dry-run lists what it would delete and deletes nothing", () => {
    const r = cli("clean --only-dist --dry-run", { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const listed = [...stripVTControlCharacters(r.stdout + r.stderr).matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(listed).toHaveLength(2);
    expect(listed).toEqual(expect.arrayContaining(["dist", "packages/a/dist"]));
    expect(remaining()).toEqual(FILES);
  });

  test("deletes exactly what --dry-run lists, nested matches included", () => {
    const dry = cli("clean --dry-run", { cwd: fixture.dir });
    expect(dry.status).toBe(0);
    const listed = [...stripVTControlCharacters(dry.stdout + dry.stderr).matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(listed).toEqual(expect.arrayContaining(["node_modules", "node_modules/dep/dist"]));

    const r = cli("clean", { cwd: fixture.dir });
    expect(r.status, r.stdout + r.stderr).toBe(0);

    const underListed = (file: string) => listed.some((match) => file === match || file.startsWith(`${match}/`));
    expect(remaining()).toEqual(FILES.filter((file) => !underListed(file)));
  });

  test("rejects an argument, and deletes nothing", () => {
    const r = cli("clean dist", { cwd: fixture.dir });

    expect(r.stderr).toMatchInlineSnapshot(`
      "error: too many arguments for 'clean'. Expected 0 arguments but got 1: dist.
      "
    `);
    expect(r.status).toBe(1);
    expect(remaining()).toEqual(FILES);
  });
});
