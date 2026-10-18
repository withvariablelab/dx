import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { resolve } from "node:path";
import { dirnameOf } from "@variablelab/clibuddy";
import type { PluginName } from "#src/lib/plugin/directory.ts";

const BIN = resolve(dirnameOf(import.meta), "../bin");
// run-run/cli/test/helpers.ts → ../../../../node_modules is the workspace root's node_modules.
const WORKSPACE_NODE_MODULES = resolve(dirnameOf(import.meta), "../../../node_modules");

type CliOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export function createTestCli() {
  return function cli(cmd: string, opts: CliOptions = {}) {
    return spawnSync(BIN, cmd.split(" ").filter(Boolean), {
      encoding: "utf8",
      cwd: opts.cwd,
      env: {
        ...process.env,
        NODE_ENV: "production",
        TEST: undefined,
        NO_COLOR: "1",
        ...opts.env,
      },
    });
  };
}

type FixtureFiles = Record<string, string>;

export function makeFixture(name: string, files: FixtureFiles): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), `rr-${name}-`));

  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }

  // Expose the workspace's `node_modules` to the fixture so any
  // `run-run.config.mts` it writes can resolve `@rrlab/*-plugin` packages.
  symlinkSync(WORKSPACE_NODE_MODULES, path.join(dir, "node_modules"), "dir");

  return {
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

type PluginEntry =
  | PluginName
  | {
      name: PluginName;
      only: readonly string[];
    };

function aliasOf(entry: PluginEntry) {
  return typeof entry === "string" ? entry : entry.name;
}

function callOf(entry: PluginEntry): string {
  if (typeof entry === "string") return `${entry}()`;
  const only = entry.only.map((k) => `"${k}"`).join(", ");
  return `${entry.name}({ only: [${only}] })`;
}

export const fixtures = {
  pkg: (name = "rr-test-fixture") => `${JSON.stringify({ name, version: "0.0.0", private: true }, null, 2)}\n`,
  biomeNoop: () =>
    `${JSON.stringify({ formatter: { enabled: false }, linter: { enabled: false }, assist: { enabled: false } }, null, 2)}\n`,
  tsconfig: () =>
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "es2020",
          module: "esnext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        // Keep tsc out of the fixture's `run-run.config.mts` (which imports
        // workspace plugins via the symlinked node_modules) — we only want
        // type-checking on the fixture's own `src/`.
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  config: (plugins: readonly PluginEntry[]) => {
    const imports = plugins.map((p) => `import ${aliasOf(p)} from "@rrlab/${aliasOf(p)}-plugin";`).join("\n");
    const list = plugins.map(callOf).join(", ");
    return `${imports}\nimport { defineConfig } from "@rrlab/cli/config";\n\nexport default defineConfig({\n  plugins: [${list}],\n});\n`;
  },
};
