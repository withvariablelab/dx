import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterEach, describe, expect, test } from "vitest";
import { createTestCli, type Fixture, type FixtureFiles, fixtures, makeFixture } from "#test/helpers.ts";

const cli = createTestCli();

/**
 * A fixture whose pnpm installs nothing, and exits with `pnpmExitCode`: the
 * plugins and their tools already resolve from the workspace's node_modules. nypm calls pnpm directly only
 * when `corepack --version` fails, and it looks a command up in each
 * node_modules/.bin above the fixture before Node's own directory, which
 * holds the real corepack, so both stubs sit in the parent's.
 */
function makeStubbedFixture(name: string, files: FixtureFiles, pnpmExitCode = 0): Fixture {
  const parent = mkdtempSync(path.join(tmpdir(), "rr-stub-pm-"));
  const bin = path.join(parent, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, "pnpm"), `#!/bin/sh\nexit ${pnpmExitCode}\n`, { mode: 0o755 });
  writeFileSync(path.join(bin, "corepack"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  const { dir } = makeFixture(name, files, { parent });
  return { dir, cleanup: () => rmSync(parent, { recursive: true, force: true }) };
}

const pnpmPkg = (extra: Record<string, unknown> = {}) =>
  `${JSON.stringify({ name: "rr-test-fixture", version: "0.0.0", private: true, ...extra, packageManager: "pnpm@10.30.3" }, null, 2)}\n`;

describe("rr plugins", () => {
  let fixture: Fixture;

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

  // The test runner's stdin and stdout are pipes, like an agent's or CI's.
  describe("add without a TTY", () => {
    test("takes the defaults, and what it writes passes `rr jsc`", () => {
      fixture = makeStubbedFixture("plugins-add-no-tty", {
        ".gitignore": "node_modules\n",
        "package.json": pnpmPkg(),
      });
      const r = cli("plugins add biome", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("Created biome.json");
      expect(r.status).toBe(0);

      expect(readFileSync(path.join(fixture.dir, "biome.json"), "utf8")).toBe(`{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@rrlab/biome-config"]
}
`);
      const jsc = cli("jsc", { cwd: fixture.dir });
      const jscOutput = jsc.stdout + jsc.stderr;
      expect(jsc.status, jscOutput).toBe(0);
      expect(stripVTControlCharacters(jscOutput)).not.toMatch(/\bdeserialize\b/);
    });

    test("patches an existing biome.json into one that passes `rr jsc`", () => {
      fixture = makeStubbedFixture("plugins-add-no-tty-patch", {
        ".gitignore": "node_modules\n",
        "package.json": pnpmPkg(),
        "biome.json": `{\n  "formatter": { "indentStyle": "space" },\n  "files": { "includes": ["**", "!dist"] }\n}\n`,
      });

      const r = cli("plugins add biome", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("Edited biome.json");
      expect(r.status).toBe(0);

      expect(readFileSync(path.join(fixture.dir, "biome.json"), "utf8")).toBe(`{
  "formatter": {
    "indentStyle": "space"
  },
  "files": {
    "includes": ["**", "!dist"]
  },
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@rrlab/biome-config"]
}
`);
      const jsc = cli("jsc", { cwd: fixture.dir });
      expect(jsc.status, jsc.stdout + jsc.stderr).toBe(0);
    });

    test("ts picks the React preset for a package that depends on react", () => {
      fixture = makeStubbedFixture("plugins-add-no-tty-react", {
        "package.json": pnpmPkg({ dependencies: { react: "^19.0.0" } }),
      });

      const r = cli("plugins add ts", { cwd: fixture.dir });
      expect(r.status).toBe(0);

      const tsconfig = JSON.parse(readFileSync(path.join(fixture.dir, "tsconfig.json"), "utf8"));
      expect(tsconfig.extends).toBe("@rrlab/ts-config/react");
    });

    test("biome again with --force leaves biome.json byte-identical", () => {
      fixture = makeStubbedFixture("plugins-add-no-tty-force", {
        ".gitignore": "node_modules\n",
        "package.json": pnpmPkg(),
      });
      expect(cli("plugins add biome", { cwd: fixture.dir }).status).toBe(0);
      const biomeJson = readFileSync(path.join(fixture.dir, "biome.json"), "utf8");

      const r = cli("plugins add biome --force", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("No changes for biome.json");
      expect(r.status).toBe(0);

      expect(readFileSync(path.join(fixture.dir, "biome.json"), "utf8")).toBe(biomeJson);
      const jsc = cli("jsc", { cwd: fixture.dir });
      expect(jsc.status, jsc.stdout + jsc.stderr).toBe(0);
    });

    test("ts with --force leaves a tsconfig.json that already extends the preset byte-identical", () => {
      const tsconfig = `{\n  "extends": "@rrlab/ts-config/no-dom/app",\n  "compilerOptions": { "lib": ["ES2022"] },\n  "include": ["src"]\n}\n`;
      fixture = makeStubbedFixture("plugins-add-no-tty-ts-force", {
        ".gitignore": "node_modules\n",
        "package.json": pnpmPkg(),
        "tsconfig.json": tsconfig,
      });
      expect(cli("plugins add biome", { cwd: fixture.dir }).status).toBe(0);

      const r = cli("plugins add ts --force", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("No changes for tsconfig.json");
      expect(r.status).toBe(0);

      expect(readFileSync(path.join(fixture.dir, "tsconfig.json"), "utf8")).toBe(tsconfig);
      const jsc = cli("jsc", { cwd: fixture.dir });
      expect(jsc.status, jsc.stdout + jsc.stderr).toBe(0);
    });

    test("a failed install marks its step failed, and configures nothing", () => {
      fixture = makeStubbedFixture("plugins-add-no-tty-fail", { "package.json": pnpmPkg() }, 1);

      const r = cli("plugins add biome", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("▲  Installing @rrlab/biome-plugin — failed");
      expect(r.status).toBe(1);
      expect(existsSync(path.join(fixture.dir, "run-run.config.mts"))).toBe(false);
    });
  });

  describe("remove without a TTY", () => {
    test("asks for --yes instead of a confirmation it can't get, and changes nothing", () => {
      const config = fixtures.config(["biome"]);
      fixture = makeFixture("plugins-remove-no-tty", {
        "package.json": fixtures.pkg(),
        "run-run.config.mts": config,
      });

      const r = cli("plugins remove biome", { cwd: fixture.dir });
      expect(r.stdout + r.stderr).toContain("Re-run it with --yes");
      expect(r.status).toBe(1);
      expect(readFileSync(path.join(fixture.dir, "run-run.config.mts"), "utf8")).toBe(config);
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
