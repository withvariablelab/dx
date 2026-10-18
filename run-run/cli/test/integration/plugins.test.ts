import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createTestCli, fixtures, makeFixture } from "#test/helpers.ts";

const cli = createTestCli();

describe("rr plugins", () => {
  let fixture: { dir: string; cleanup: () => void };

  afterEach(() => fixture?.cleanup());

  describe("list", () => {
    test("hints toward `add` when no run-run.config exists", () => {
      fixture = makeFixture("plugins-list-empty", {
        "package.json": fixtures.pkg(),
      });
      const r = cli("plugins list", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toMatch(/No run-run\.config.*found/);
      expect(r.status).toBe(0);
    });

    test("prints each plugin entry one per line", () => {
      fixture = makeFixture("plugins-list-full", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": fixtures.config(["biome", "ts"]),
      });
      const r = cli("plugins list", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/run-run\.config\.mts/);
      expect(combined).toMatch(/- biome/);
      expect(combined).toMatch(/- ts/);
      expect(r.status).toBe(0);
    });
  });

  describe("add --dry-run", () => {
    test("enumerates the would-do plan without touching the filesystem", () => {
      fixture = makeFixture("plugins-add-dryrun", {
        "package.json": fixtures.pkg(),
      });
      const r = cli("plugins add biome --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Would: install @rrlab\/biome-plugin/);
      expect(combined).toMatch(/Would: add biome\(\) to run-run\.config\.mts/);
      expect(combined).toMatch(/Dry run complete/);
      expect(r.status).toBe(0);
    });

    test("rejects an unknown alias before touching the filesystem", () => {
      fixture = makeFixture("plugins-add-unknown", {
        "package.json": fixtures.pkg(),
      });
      const r = cli("plugins add not-an-alias --dry-run", { cwd: fixture.dir });
      const combined = r.stderr + r.stdout;
      expect(combined).toMatch(/'not-an-alias' is invalid for argument 'name'/);
      expect(combined).toMatch(/Allowed choices are ts, biome, oxc, tsdown, vitest, astro/);
      expect(r.status).not.toBe(0);
    });

    test("accepts <alias>@<spec> and threads the spec into the install plan", () => {
      fixture = makeFixture("plugins-add-tagged", {
        "package.json": fixtures.pkg(),
      });
      const r = cli("plugins add biome@pr-226 --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Would: install @rrlab\/biome-plugin@pr-226/);
      expect(r.status).toBe(0);
    });

    test("upgrades the plugin to <spec> when it is already in package.json", () => {
      fixture = makeFixture("plugins-add-upgrade", {
        "package.json": `${JSON.stringify(
          { name: "rr-test-fixture", version: "0.0.0", private: true, devDependencies: { "@rrlab/biome-plugin": "0.1.0" } },
          null,
          2,
        )}\n`,
      });
      const r = cli("plugins add biome@pr-226 --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Would: install @rrlab\/biome-plugin@pr-226.*will be updated to this spec/);
      expect(r.status).toBe(0);
    });

    test("at a pnpm workspace root, the plan targets the workspace root", () => {
      fixture = makeFixture("plugins-add-monorepo", {
        "package.json": fixtures.pkg(),
        "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n",
      });
      const r = cli("plugins add biome --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Would: install @rrlab\/biome-plugin.*workspace root/);
      expect(r.status).toBe(0);
    });

    test.each([
      ["settings-only", "minimumReleaseAge: 1440\n"],
      ["root-only", "packages:\n  - .\n"],
    ])("with a %s pnpm-workspace.yaml, the plan targets the current package", (_, pnpmWorkspace) => {
      fixture = makeFixture("plugins-add-pnpm-settings", {
        "package.json": fixtures.pkg(),
        "pnpm-workspace.yaml": pnpmWorkspace,
      });
      const r = cli("plugins add biome --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Would: install @rrlab\/biome-plugin.*current package/);
      expect(r.status).toBe(0);
    });
  });

  describe("remove --dry-run", () => {
    test("prints the plan and does not touch the config when only configured", () => {
      fixture = makeFixture("plugins-remove-dryrun", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": fixtures.config(["biome", "ts"]),
      });
      const r = cli("plugins remove biome --dry-run", { cwd: fixture.dir });
      const combined = r.stdout + r.stderr;
      expect(combined).toMatch(/Plan:/);
      expect(combined).toMatch(/Remove biome\(\) from run-run\.config\.mts/);
      expect(combined).toMatch(/Dry run complete/);
      expect(r.status).toBe(0);
    });

    test("reports nothing to do when the plugin is neither configured nor installed", () => {
      fixture = makeFixture("plugins-remove-missing", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": fixtures.config(["ts"]),
      });
      const r = cli("plugins remove biome --dry-run", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toMatch(/'biome' is not installed nor configured/);
      expect(r.status).toBe(0);
    });
  });

  describe("remove --yes", () => {
    test("removes the plugin entry from the config without prompting", () => {
      fixture = makeFixture("plugins-remove-yes", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": fixtures.config(["biome", "ts"]),
      });
      const r = cli("plugins remove biome --yes", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toMatch(/Removed biome\(\) from run-run\.config\.mts/);
      expect(r.status).toBe(0);
    });

    test("removes an entry that carries an `only` option object", () => {
      fixture = makeFixture("plugins-remove-only", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": fixtures.config([{ name: "biome", only: ["lint", "format"] }, "ts"]),
      });
      const r = cli("plugins remove biome --yes", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toMatch(/Removed biome\(\) from run-run\.config\.mts/);
      expect(r.status).toBe(0);

      const after = readFileSync(path.join(fixture.dir, "run-run.config.mts"), "utf8");
      expect(after).not.toMatch(/biome/);
      expect(after).toMatch(/ts\(\)/);
    });
  });
});
