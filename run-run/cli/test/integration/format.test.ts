import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestCli, fixtures, makeFixture } from "#test/helpers.ts";

const cli = createTestCli();

describe("rr format", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeFixture("format", {
      "package.json": fixtures.pkg(),
      "biome.json": fixtures.biomeNoop(),
      "run-run.config.mts": fixtures.config(["biome"]),
      "src/ok.ts": "export const ok = 1;\n",
    });
  });

  afterEach(() => fixture.cleanup());

  test("doctor: exits 0 and reports biome healthy as a board row", () => {
    const r = cli("format doctor", { cwd: fixture.dir });
    expect(r.stdout + r.stderr).toContain("biome");
    expect(r.status).toBe(0);
  });

  test("runs biome format end-to-end and renders a board row labelled with the tool", () => {
    const r = cli("format", { cwd: fixture.dir });
    const combined = r.stdout + r.stderr;
    // The row label is the formatter's `ui` ("biome"); a clean exit proves it ran.
    expect(combined).toContain("biome");
    expect(r.status).toBe(0);
  });
});

describe("rr format (oxc)", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeFixture("format-oxc", {
      "package.json": fixtures.pkg(),
      "run-run.config.mts": fixtures.config(["oxc"]),
      "src/ugly.ts": "export const  ugly=1\n",
    });
  });

  afterEach(() => fixture.cleanup());

  test("checks with oxfmt and fails on an unformatted file", () => {
    const r = cli("format", { cwd: fixture.dir });
    expect(r.stdout + r.stderr).toContain("src/ugly.ts");
    expect(r.status).not.toBe(0);
  });

  test("--fix writes the file formatted", () => {
    const r = cli("format --fix", { cwd: fixture.dir });
    expect(r.status).toBe(0);
    expect(readFileSync(path.join(fixture.dir, "src/ugly.ts"), "utf8")).toBe("export const ugly = 1;\n");
  });
});
