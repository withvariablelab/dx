import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dirnameOf } from "@variablelab/clibuddy";
import { afterEach, describe, expect, test } from "vitest";
import { type Fixture, type FixtureFiles, makeFixture } from "#test/helpers.ts";

const PKG_DIR = path.resolve(dirnameOf(import.meta), "../..");
const REPO_DIR = path.resolve(PKG_DIR, "../..");
const LEFTHOOK = path.join(REPO_DIR, "node_modules/.bin/lefthook");
const BASE = "node_modules/@rrlab/cli/lefthook/base.yml";
const TURBOREPO = "node_modules/@rrlab/cli/lefthook/turborepo.yml";

type Job = { name?: string; run?: string; skip?: boolean };
type LefthookConfig = Partial<Record<"pre-commit" | "pre-push", { jobs: Job[] }>>;

const yaml = (...lines: string[]) => `${lines.join("\n")}\n`;
const extendsOf = (...files: string[]) => yaml("extends:", ...files.map((file) => `  - ${file}`));

describe("the lefthook configs in @rrlab/cli/lefthook", () => {
  let fixture: Fixture | undefined;

  afterEach(() => fixture?.cleanup());

  function git(...args: string[]) {
    const r = spawnSync("git", args, { cwd: fixture?.dir, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  }

  const lefthook = (...args: string[]) => spawnSync(LEFTHOOK, args, { cwd: fixture?.dir, encoding: "utf8" });

  function dump(files: FixtureFiles, ...args: string[]): string {
    fixture = makeFixture("lefthook", files);
    git("init", "-q");

    const r = lefthook("dump", ...args);
    expect(r.status, r.stderr).toBe(0);
    return r.stdout;
  }

  const dumpJson = (files: FixtureFiles) => JSON.parse(dump(files, "--format", "json")) as LefthookConfig;

  function validate(files: FixtureFiles) {
    fixture = makeFixture("lefthook", files);
    git("init", "-q");
    return lefthook("validate");
  }

  const skipTsc = (...lines: string[]) =>
    `${extendsOf(BASE)}\n${yaml("pre-commit:", "  jobs:", "    - name: tsc", ...lines, "      skip: true")}`;

  test("a turborepo that extends base.yml and turborepo.yml gets the pre-commit jobs and the affected tests", () => {
    expect(dump({ "lefthook.yml": extendsOf(BASE, TURBOREPO) })).toMatchInlineSnapshot(`
      "extends:
        - node_modules/@rrlab/cli/lefthook/base.yml
        - node_modules/@rrlab/cli/lefthook/turborepo.yml
      pre-commit:
        parallel: true
        jobs:
          - name: jsc
            run: pnpm rr jsc --fix-staged
            stage_fixed: true
          - name: tsc
            run: pnpm rr tsc
            glob:
              - '*.{ts,tsx,mts,cts}'
              - '*tsconfig*.json'
          - name: gitleaks
            run: mise exec -- gitleaks git --pre-commit --staged --redact
      pre-push:
        jobs:
          - name: test
            run: |
              branch="$(git branch --show-current)"

              if [ "$branch" = "main" ]; then
                pnpm turbo run test --filter='...[HEAD^]'
              else
                pnpm turbo run test --affected
              fi
      "
    `);
  });

  test("a repo adds its own jobs beside the shared ones", () => {
    const own = yaml(
      "pre-commit:",
      "  jobs:",
      "    - name: i18n",
      "      run: pnpm --filter i18n build",
      "pre-push:",
      "  jobs:",
      "    - name: test",
      "      run: pnpm rr test run",
    );
    const config = dumpJson({ "lefthook.yml": `${extendsOf(BASE)}\n${own}` });

    expect(config["pre-commit"]?.jobs.map((job) => job.name)).toEqual(["i18n", "jsc", "tsc", "gitleaks"]);
    expect(config["pre-push"]?.jobs).toEqual([{ name: "test", run: "pnpm rr test run" }]);
  });

  test.each([
    { node_modules: "without @rrlab/cli", linkNodeModules: false, status: 1 },
    { node_modules: "with @rrlab/cli", linkNodeModules: true, status: 0 },
  ])("dx's shared-hooks job exits $status in a repo $node_modules", ({ linkNodeModules, status }) => {
    const files = { "lefthook.yml": readFileSync(path.join(REPO_DIR, "lefthook.yml"), "utf8"), "a.txt": "a\n" };
    fixture = makeFixture("lefthook", files, { linkNodeModules });
    git("init", "-q");
    git("add", "a.txt");

    const r = lefthook("run", "pre-commit", "--job", "shared-hooks", "--no-auto-install", "--colors", "off");

    expect(r.status, r.stdout).toBe(status);
    expect(r.stdout.includes("run pnpm install")).toBe(status === 1);
  });

  test("a repo overrides a shared job from a file it lists later in extends", () => {
    const config = dumpJson({
      "lefthook.yml": extendsOf(BASE, TURBOREPO, "lefthook/test.yml"),
      "lefthook/test.yml": yaml("pre-push:", "  jobs:", "    - name: test", "      run: pnpm test"),
    });

    expect(config["pre-push"]?.jobs).toEqual([{ name: "test", run: "pnpm test" }]);
  });

  test("lefthook validate refuses a repo's job that sets skip: true with no run", () => {
    expect(validate({ "lefthook.yml": skipTsc() }).status).not.toBe(0);
  });

  test("a repo skips a shared job with skip: true beside a run line, and the shared run stays", () => {
    const r = validate({ "lefthook.yml": skipTsc("      run: echo not-the-shared-run") });
    expect(r.status, r.stdout + r.stderr).toBe(0);

    const config = JSON.parse(lefthook("dump", "--format", "json").stdout) as LefthookConfig;
    expect(config["pre-commit"]?.jobs.find((job) => job.name === "tsc")).toMatchObject({
      run: "pnpm rr tsc",
      skip: true,
    });
  });

  test("the package ships both files", () => {
    const r = spawnSync("pnpm", ["pack", "--dry-run", "--json"], { cwd: PKG_DIR, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);

    const { files } = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"))) as { files: { path: string }[] };
    expect(files.map((file) => file.path).filter((file) => file.startsWith("lefthook/"))).toEqual([
      "lefthook/base.yml",
      "lefthook/turborepo.yml",
    ]);
  });
});
