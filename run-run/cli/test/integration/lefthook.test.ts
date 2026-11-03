import { spawnSync } from "node:child_process";
import path from "node:path";
import { dirnameOf } from "@variablelab/clibuddy";
import { afterEach, describe, expect, test } from "vitest";
import { type Fixture, type FixtureFiles, makeFixture } from "#test/helpers.ts";

const PKG_DIR = path.resolve(dirnameOf(import.meta), "../..");
const BASE = "node_modules/@rrlab/cli/lefthook/base.yml";
const TURBOREPO = "node_modules/@rrlab/cli/lefthook/turborepo.yml";
const GITLEAKS = "mise exec -- gitleaks git --pre-commit --staged --redact";

const yaml = (...lines: string[]) => `${lines.join("\n")}\n`;
const extendsOf = (...files: string[]) => yaml("extends:", ...files.map((file) => `  - ${file}`));

describe("the lefthook configs in @rrlab/cli/lefthook", () => {
  const fixtures: Fixture[] = [];

  afterEach(() => {
    for (const fixture of fixtures.splice(0)) fixture.cleanup();
  });

  function dump(files: FixtureFiles): string {
    const fixture = makeFixture("lefthook", files);
    fixtures.push(fixture);
    const init = spawnSync("git", ["init", "-q"], { cwd: fixture.dir, encoding: "utf8" });
    expect(init.status, init.stderr).toBe(0);

    const r = spawnSync(path.join(fixture.dir, "node_modules/.bin/lefthook"), ["dump"], {
      cwd: fixture.dir,
      encoding: "utf8",
    });
    expect(r.status, r.stderr).toBe(0);
    return r.stdout;
  }

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

    expect(dump({ "lefthook.yml": `${extendsOf(BASE)}\n${own}` })).toMatchInlineSnapshot(`
      "extends:
        - node_modules/@rrlab/cli/lefthook/base.yml
      pre-commit:
        parallel: true
        jobs:
          - name: i18n
            run: pnpm --filter i18n build
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
            run: pnpm rr test run
      "
    `);
  });

  test("a repo's own gitleaks job merges with the shared one, and still runs when the shared file is missing", () => {
    const own = yaml("pre-commit:", "  jobs:", "    - name: gitleaks", `      run: ${GITLEAKS}`);
    const gitleaksJobs = (config: string) => config.match(/- name: gitleaks\n\s+run: (.+)/g);
    const expected = [`- name: gitleaks\n      run: ${GITLEAKS}`];

    expect(gitleaksJobs(dump({ "lefthook.yml": `${extendsOf(BASE)}\n${own}` }))).toEqual(expected);

    const missing = dump({ "lefthook.yml": `${extendsOf("node_modules/@rrlab/cli/lefthook/missing.yml")}\n${own}` });
    expect(gitleaksJobs(missing)).toEqual(expected);
    expect(missing).not.toContain("name: jsc");
  });

  test("a repo overrides a shared job from a file it lists later in extends", () => {
    const config = dump({
      "lefthook.yml": extendsOf(BASE, TURBOREPO, "lefthook/test.yml"),
      "lefthook/test.yml": yaml("pre-push:", "  jobs:", "    - name: test", "      run: pnpm test"),
    });

    expect(config.slice(config.indexOf("pre-push:"))).toMatchInlineSnapshot(`
      "pre-push:
        jobs:
          - name: test
            run: pnpm test
      "
    `);
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
