import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestCli, fixtures, makeFixture } from "#test/helpers.ts";

const cli = createTestCli();

describe("rr lint", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeFixture("lint", {
      "package.json": fixtures.pkg(),
      "biome.json": fixtures.biomeNoop(),
      "run-run.config.mts": fixtures.config(["biome"]),
      "src/ok.ts": "export const ok = 1;\n",
    });
  });

  afterEach(() => fixture.cleanup());

  test("doctor: exits 0 and reports biome healthy as a board row", () => {
    const r = cli("lint doctor", { cwd: fixture.dir });
    expect(r.stdout + r.stderr).toContain("biome");
    expect(r.status).toBe(0);
  });

  test("runs biome end-to-end and renders a board row labelled with the tool", () => {
    const r = cli("lint", { cwd: fixture.dir });
    const combined = r.stdout + r.stderr;
    // The row label is the linter's `ui` ("biome"); a clean exit proves it ran.
    expect(combined).toContain("biome");
    expect(r.status).toBe(0);
  });
});

describe("rr lint (oxc)", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeFixture("lint-oxc", {
      // oxlint skips a real node_modules but walks the fixture's symlinked one, unless it's ignored.
      ".gitignore": "node_modules\n",
      "package.json": fixtures.pkg(),
      "run-run.config.mts": fixtures.config(["oxc"]),
      "src/debug.ts": "export function f() {\n  debugger;\n}\n",
    });
  });

  afterEach(() => fixture.cleanup());

  // oxlint has no `--check` flag: it checks by default, and a warning doesn't fail it.
  test("runs oxlint in its default check mode", () => {
    const r = cli("lint", { cwd: fixture.dir });
    const combined = r.stdout + r.stderr;
    expect(combined).toContain("$ oxlint --report-unused-disable-directives\n");
    expect(combined).toContain("no-debugger");
    expect(r.status).toBe(0);
  });
});
