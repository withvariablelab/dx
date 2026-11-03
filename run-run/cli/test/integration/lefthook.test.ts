import { spawnSync } from "node:child_process";
import path from "node:path";
import { dirnameOf } from "@variablelab/clibuddy";
import { afterEach, describe, expect, test } from "vitest";
import { type Fixture, type FixtureFiles, makeFixture } from "#test/helpers.ts";

const PKG_DIR = path.resolve(dirnameOf(import.meta), "../..");
const BASE = "node_modules/@rrlab/cli/lefthook/base.yml";
const TURBOREPO = "node_modules/@rrlab/cli/lefthook/turborepo.yml";
const GITLEAKS = { name: "gitleaks", run: "mise exec -- gitleaks git --pre-commit --staged --redact" };

type Job = { name?: string; run?: string };
type LefthookConfig = Partial<Record<"pre-commit" | "pre-push", { jobs: Job[] }>>;

const yaml = (...lines: string[]) => `${lines.join("\n")}\n`;
const extendsOf = (...files: string[]) => yaml("extends:", ...files.map((file) => `  - ${file}`));
const ownGitleaks = yaml("pre-commit:", "  jobs:", `    - name: ${GITLEAKS.name}`, `      run: ${GITLEAKS.run}`);

describe("the lefthook configs in @rrlab/cli/lefthook", () => {
  let fixture: Fixture | undefined;

  afterEach(() => fixture?.cleanup());

  function dump(files: FixtureFiles, ...args: string[]): string {
    fixture = makeFixture("lefthook", files);
    const init = spawnSync("git", ["init", "-q"], { cwd: fixture.dir, encoding: "utf8" });
    expect(init.status, init.stderr).toBe(0);

    const r = spawnSync(path.join(fixture.dir, "node_modules/.bin/lefthook"), ["dump", ...args], {
      cwd: fixture.dir,
      encoding: "utf8",
    });
    expect(r.status, r.stderr).toBe(0);
    return r.stdout;
  }

  const dumpJson = (files: FixtureFiles) => JSON.parse(dump(files, "--format", "json")) as LefthookConfig;

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

  test("a repo's own gitleaks job with the same command merges with the shared one", () => {
    const config = dumpJson({ "lefthook.yml": `${extendsOf(BASE)}\n${ownGitleaks}` });

    expect(config["pre-commit"]?.jobs.filter((job) => job.name === GITLEAKS.name)).toEqual([GITLEAKS]);
  });

  test("a repo's own gitleaks job still runs when the shared file is missing", () => {
    const missing = "node_modules/@rrlab/cli/lefthook/missing.yml";
    const config = dumpJson({ "lefthook.yml": `${extendsOf(missing)}\n${ownGitleaks}` });

    expect(config["pre-commit"]?.jobs).toEqual([GITLEAKS]);
  });

  test("a repo overrides a shared job from a file it lists later in extends", () => {
    const config = dumpJson({
      "lefthook.yml": extendsOf(BASE, TURBOREPO, "lefthook/test.yml"),
      "lefthook/test.yml": yaml("pre-push:", "  jobs:", "    - name: test", "      run: pnpm test"),
    });

    expect(config["pre-push"]?.jobs).toEqual([{ name: "test", run: "pnpm test" }]);
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
