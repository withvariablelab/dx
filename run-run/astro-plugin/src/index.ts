import { createRequire } from "node:module";
import {
  definePlugin,
  type InstallContext,
  type InstallResult,
  type RunReport,
  ToolService,
  type TypeChecker,
  type TypeCheckOptions,
  type UninstallContext,
  type UninstallResult,
} from "@rrlab/cli/plugin";
import { colorize, type ShellService } from "@variablelab/clibuddy";
import { TOOL_VERSIONS } from "./tool-versions.ts";

export { TOOL_VERSIONS } from "./tool-versions.ts";

const FROM = import.meta.url;
const localRequire = createRequire(FROM);
// What `astro check` loads from the project root before checking anything.
const CHECK_DEPS = ["@astrojs/check", "typescript"] as const;
const astroColor = colorize("#BC52EE");

export class AstroCheckService extends ToolService implements TypeChecker {
  #cwd: string;

  constructor(shellService: ShellService, cwd: string) {
    super({ bin: "astro", color: astroColor, shellService, from: FROM });
    this.#cwd = cwd;
  }

  async check(options: TypeCheckOptions = {}): Promise<RunReport> {
    const cwd = options.cwd ?? this.#cwd;
    const missing = missingCheckDeps(cwd);
    if (missing.length > 0) return missingDepsReport(missing);
    // `astro check`, not @astrojs/check's own `astro-check` bin: only the
    // former runs `astro sync` first, so generated types (content collections,
    // `astro:env`, …) exist. Its diagnostics keep their color when captured.
    return this.runReport(["check"], { cwd });
  }

  override async doctor(): Promise<RunReport> {
    const missing = missingCheckDeps(this.#cwd);
    if (missing.length > 0) return missingDepsReport(missing);
    return super.doctor();
  }
}

/**
 * Lists the `astro check` dependencies the project at `root` can't resolve,
 * looking them up the way astro does (`require.resolve(pkg, { paths: [root] })`).
 * When one is missing, astro prompts to install it instead of checking: under a
 * captured run that prompt hangs, and with stdin closed astro exits 0 having
 * checked nothing. So we fail before running it.
 */
export function missingCheckDeps(root: string): string[] {
  return CHECK_DEPS.filter((pkg) => {
    try {
      localRequire.resolve(pkg, { paths: [root] });
      return false;
    } catch {
      return true;
    }
  });
}

function missingDepsReport(missing: string[]): RunReport {
  return {
    ok: false,
    output:
      `@rrlab/astro-plugin requires ${missing.join(", ")} to be installed in the host project. ` +
      `Run: rr plugins add astro  (or: pnpm add -D ${missing.join(" ")})`,
  };
}

// No config scaffolding: an Astro project already has its tsconfig.json, and
// `astro` itself is the host's own dependency, so only the checker is added.
export async function install(_ctx: InstallContext): Promise<InstallResult> {
  return {
    devDependencies: {
      "@astrojs/check": TOOL_VERSIONS["@astrojs/check"].install,
      typescript: TOOL_VERSIONS.typescript.install,
    },
  };
}

export async function uninstall(_ctx: UninstallContext): Promise<UninstallResult> {
  return { removeDependencies: ["@astrojs/check", "typescript"] };
}

const astro = definePlugin({
  apiVersion: 1,
  name: "astro",
  color: astroColor,
  install,
  uninstall,
  services: ({ shell, cwd }) => ({ typecheck: new AstroCheckService(shell, cwd) }),
});

export default astro;
