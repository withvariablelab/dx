import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TEMPLATES } from "#src/actions/template.ts";
import { biomeCheck, createTestCli, makeTmpDir, oxfmtCheck, pathExists } from "#test/helpers.ts";

const cli = createTestCli();

async function readChangelogRepo(projectDir: string): Promise<string> {
  const config = JSON.parse(await readFile(path.join(projectDir, ".changeset", "config.json"), "utf8"));
  return config.changelog[1].repo;
}

describe("vland init (template scaffolding)", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = makeTmpDir("init-templates");
  });

  afterEach(() => fixture.cleanup());

  test("library: defaults to the public @variablelab scope when --visibility is omitted", async () => {
    const name = "my-lib";
    const r = cli(`init ${name} -t library --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    const pkg = JSON.parse(await readFile(path.join(projectDir, "package.json"), "utf8"));
    expect(pkg.name).toBe(`@variablelab/${name}`);
    expect(pkg.private).toBeUndefined();
    expect(pkg.devDependencies).toMatchObject({ "@rrlab/cli": expect.any(String) });

    const license = await readFile(path.join(projectDir, "LICENSE"), "utf8");
    expect(license).not.toContain("{{");

    const readme = await readFile(path.join(projectDir, "README.md"), "utf8");
    expect(readme).toContain(`pnpm add @variablelab/${name}`);
    expect(readme).not.toContain("{{");

    expect(await readChangelogRepo(projectDir)).toBe(`withvariablelab/${name}`);
  });

  test("library: --visibility=private uses @variableland scope and sets private:true", async () => {
    const name = "env";
    const r = cli(`init ${name} -t library --visibility=private --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const pkg = JSON.parse(await readFile(path.join(fixture.dir, name, "package.json"), "utf8"));
    expect(pkg.name).toBe(`@variableland/${name}`);
    expect(pkg.private).toBe(true);
    expect(await readChangelogRepo(path.join(fixture.dir, name))).toBe(`variableland/${name}`);
  });

  test("library: --visibility=public uses @variablelab scope and no private flag", async () => {
    const name = "env";
    const r = cli(`init ${name} -t library --visibility=public --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const pkg = JSON.parse(await readFile(path.join(fixture.dir, name, "package.json"), "utf8"));
    expect(pkg.name).toBe(`@variablelab/${name}`);
    expect(pkg.private).toBeUndefined();
  });

  test("library: ships an empty run-run.config.mts and no per-tool config files", async () => {
    const name = "my-lib";
    const r = cli(`init ${name} -t library --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    expect(pathExists(path.join(projectDir, "run-run.config.mts"))).toBe(true);
    expect(pathExists(path.join(projectDir, "biome.json"))).toBe(false);
    expect(pathExists(path.join(projectDir, "tsconfig.json"))).toBe(false);
    expect(pathExists(path.join(projectDir, "tsdown.config.ts"))).toBe(false);

    const rrConfig = await readFile(path.join(projectDir, "run-run.config.mts"), "utf8");
    expect(rrConfig).toContain("@rrlab/cli/config");
    expect(rrConfig).toMatch(/plugins:\s*\[\]/);
  });

  test("library: package.json scripts don't wrap rr commands", async () => {
    const name = "my-lib";
    const r = cli(`init ${name} -t library --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const pkg = JSON.parse(await readFile(path.join(fixture.dir, name, "package.json"), "utf8"));
    const scriptNames = Object.keys(pkg.scripts ?? {});
    expect(scriptNames).not.toContain("lint");
    expect(scriptNames).not.toContain("lint:fix");
    expect(scriptNames).not.toContain("tscheck");
    expect(scriptNames).not.toContain("check");
    expect(scriptNames).not.toContain("build");
  });

  test("backend: clears placeholders, sets private:true, wires the logger service name", async () => {
    const name = "assets";
    const r = cli(`init ${name} -t backend --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    const pkg = JSON.parse(await readFile(path.join(projectDir, "package.json"), "utf8"));
    expect(pkg.name).toBe(name);
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies).toMatchObject({ elysia: expect.any(String), evlog: expect.any(String) });

    const logger = await readFile(path.join(projectDir, "src", "logger.ts"), "utf8");
    expect(logger).toContain(`service: "${name}"`);
  });

  test("monorepo: bare-name apps and scoped packages, with private:true at root", async () => {
    const name = "yoppy";
    const r = cli(`init ${name} -t monorepo --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    const rootPkg = JSON.parse(await readFile(path.join(projectDir, "package.json"), "utf8"));
    expect(rootPkg.name).toBe(name);
    expect(rootPkg.private).toBe(true);

    const apiPkg = JSON.parse(await readFile(path.join(projectDir, "apps", "api", "package.json"), "utf8"));
    expect(apiPkg.name).toBe(`${name}-api`);
    expect(apiPkg.dependencies).toMatchObject({ [`@${name}/types`]: "workspace:*" });

    const webPkg = JSON.parse(await readFile(path.join(projectDir, "apps", "web", "package.json"), "utf8"));
    expect(webPkg.name).toBe(`${name}-web`);

    const typesPkg = JSON.parse(await readFile(path.join(projectDir, "packages", "types", "package.json"), "utf8"));
    expect(typesPkg.name).toBe(`@${name}/types`);

    expect(await readChangelogRepo(projectDir)).toBe(`variableland/${name}`);
  });

  test.each(TEMPLATES)("%s: pins node and pnpm with mise and a lockfile", async (template) => {
    const name = `std-${template}`;
    const r = cli(`init ${name} -t ${template} --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    expect(pathExists(path.join(projectDir, ".node-version"))).toBe(false);

    // rr loads run-run.config.mts with Node's type stripping, unflagged from 22.18.0.
    const pkg = JSON.parse(await readFile(path.join(projectDir, "package.json"), "utf8"));
    expect(pkg.engines.node).toBe(">=22.18.0");

    const miseToml = await readFile(path.join(projectDir, "mise.toml"), "utf8");
    expect(miseToml).toMatch(/\[settings\]\nlockfile = true/);

    // CI's mise-action runs `mise install --locked`, which needs every tool locked.
    const miseLock = await readFile(path.join(projectDir, "mise.lock"), "utf8");
    for (const tool of ["node", "pnpm"]) {
      expect(miseLock).toContain(`[[tools.${tool}]]`);
      expect(miseLock).toContain(`[tools.${tool}."platforms.linux-x64"]`);
    }
  });

  test.each([
    ["library", ""],
    ["library", "--visibility=private"],
    ["backend", ""],
    ["monorepo", ""],
  ])("%s %s: every file passes oxfmt and Biome, so `rr check` starts green with either", (template, flags) => {
    const name = `fmt-${template}`;
    const r = cli(`init ${name} -t ${template} ${flags} --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    // oxfmt (`rr plugins add oxc`) also formats Markdown and sorts package.json keys.
    const projectDir = path.join(fixture.dir, name);
    const fmt = oxfmtCheck(projectDir);
    expect(fmt.status, fmt.stdout + fmt.stderr).toBe(0);

    const biome = biomeCheck(projectDir);
    expect(biome.status, biome.stdout + biome.stderr).toBe(0);
  });

  test.each(TEMPLATES)("%s: pins every workflow action by SHA and checks out without credentials", async (template) => {
    const name = `ci-${template}`;
    const r = cli(`init ${name} -t ${template} --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const workflowsDir = path.join(fixture.dir, name, ".github", "workflows");
    const workflows = await readdir(workflowsDir);
    expect(workflows).toContain("ci.yml");
    expect(workflows).toContain("workflow-audit.yml");

    for (const file of workflows) {
      const body = await readFile(path.join(workflowsDir, file), "utf8");
      const actions = body.match(/(?<=uses: )\S+/g) ?? [];
      for (const action of actions) {
        expect(action, `${file}: ${action}`).toMatch(/@[0-9a-f]{40}$/);
      }
      const checkouts = actions.filter((action) => action.startsWith("actions/checkout@")).length;
      expect(body.match(/persist-credentials: false/g)?.length ?? 0, file).toBe(checkouts);
    }
  });

  test("monorepo: ships an empty run-run.config.mts at root and in each workspace", async () => {
    const name = "my-mono";
    const r = cli(`init ${name} -t monorepo --no-install --no-git`, { cwd: fixture.dir });
    expect(r.status).toBe(0);

    const projectDir = path.join(fixture.dir, name);
    for (const dir of ["", "apps/api", "apps/web", "packages/types"]) {
      const cfg = path.join(projectDir, dir, "run-run.config.mts");
      expect(pathExists(cfg), `expected ${cfg} to exist`).toBe(true);
      const body = await readFile(cfg, "utf8");
      expect(body).toMatch(/plugins:\s*\[\]/);
    }
  });

  test("refuses to overwrite a non-empty target dir without --force", () => {
    const name = "dup-lib";
    cli(`init ${name} -t library --no-install --no-git`, { cwd: fixture.dir });
    const second = cli(`init ${name} -t library --no-install --no-git`, { cwd: fixture.dir });
    expect(second.status).not.toBe(0);
    expect(second.stdout + second.stderr).toMatch(/--force/);
  });
});
