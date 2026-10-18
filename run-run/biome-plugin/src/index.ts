import fs from "node:fs/promises";
import path from "node:path";
import {
  decideScaffold,
  definePlugin,
  type FileOp,
  type FormatOptions,
  type Formatter,
  type InstallContext,
  type InstallResult,
  type Linter,
  type LintOptions,
  type RunReport,
  type StaticChecker,
  type StaticCheckerOptions,
  ToolService,
  type UninstallContext,
  type UninstallResult,
} from "@rrlab/cli/plugin";
import { colorize, isCI, type ShellService } from "@variablelab/clibuddy";
import { parse as parseJsonc } from "comment-json";
import { TOOL_VERSIONS } from "./tool-versions.ts";

const FROM = import.meta.url;
const COMMON_FLAGS = ["--colors=force", "--no-errors-on-unmatched"];
const BIOME_JSON = "biome.json";
const BIOME_CONFIG_PKG = "@rrlab/biome-config";
// The installed Biome's own schema: a versioned URL drifts from `^2.0.0` and Biome flags the mismatch.
const BIOME_SCHEMA = "./node_modules/@biomejs/biome/configuration_schema.json";

export { TOOL_VERSIONS } from "./tool-versions.ts";

const biomeColor = colorize("#61A5FA");

export class BiomeService extends ToolService implements Formatter, Linter, StaticChecker {
  constructor(shellService: ShellService) {
    super({ pkg: "@biomejs/biome", bin: "biome", color: biomeColor, shellService, from: FROM });
  }

  async format(options: FormatOptions): Promise<RunReport> {
    const args = ["format", ...COMMON_FLAGS];
    if (options.fix) args.push("--fix");
    return this.runReport(args);
  }

  async lint(options: LintOptions): Promise<RunReport> {
    const args = ["check", ...COMMON_FLAGS, "--formatter-enabled=false"];
    if (options.fix) args.push("--fix", "--unsafe");
    return this.runReport(args);
  }

  async check(options: StaticCheckerOptions): Promise<RunReport> {
    const args = options.fix
      ? ["check", ...COMMON_FLAGS, "--fix"]
      : options.fixStaged
        ? ["check", ...COMMON_FLAGS, "--fix", "--staged"]
        : [isCI ? "ci" : "check", ...COMMON_FLAGS];
    return this.runReport(args);
  }
}

export async function install(ctx: InstallContext): Promise<InstallResult> {
  const biomeJsonPath = path.join(ctx.appPkg.dirPath, BIOME_JSON);
  const fileExists = await pathExists(biomeJsonPath);
  const scaffoldDecision = await decideScaffold(ctx, {
    label: BIOME_JSON,
    fileExists,
    patchHint: `add ${BIOME_CONFIG_PKG} to extends, keep my other settings`,
  });

  if (scaffoldDecision === "skip") {
    return { devDependencies: { "@biomejs/biome": TOOL_VERSIONS["@biomejs/biome"].install } };
  }

  const devDependencies: Record<string, string> = {
    "@biomejs/biome": TOOL_VERSIONS["@biomejs/biome"].install,
    [BIOME_CONFIG_PKG]: await ctx.release.resolve(BIOME_CONFIG_PKG),
  };

  const file: FileOp =
    scaffoldDecision === "create" || scaffoldDecision === "overwrite"
      ? {
          kind: "create",
          path: BIOME_JSON,
          // In Biome's own format, which keeps a short array on one line, so `rr jsc` passes on it.
          content: `{\n  "$schema": "${BIOME_SCHEMA}",\n  "extends": ["${BIOME_CONFIG_PKG}"]\n}\n`,
          overwrite: scaffoldDecision === "overwrite" || ctx.flags.force,
        }
      : {
          kind: "edit-json",
          path: BIOME_JSON,
          edits: [
            { op: "set", path: "/$schema", value: BIOME_SCHEMA, mode: "if-missing" },
            { op: "include", path: "/extends", value: BIOME_CONFIG_PKG, position: "start" },
          ],
        };

  return { devDependencies, files: [file] };
}

export async function uninstall(ctx: UninstallContext): Promise<UninstallResult> {
  const biomeJsonPath = path.join(ctx.appPkg.dirPath, BIOME_JSON);
  const removeDependencies = ["@biomejs/biome", BIOME_CONFIG_PKG];

  if (!(await pathExists(biomeJsonPath))) {
    return { removeDependencies };
  }

  let existing: Record<string, unknown> | undefined;
  try {
    const text = await fs.readFile(biomeJsonPath, "utf8");
    existing = parseJsonc(text) as Record<string, unknown>;
  } catch {
    /* malformed — skip surgical edits */
  }

  const files: FileOp[] = [];
  if (existing) {
    const extendsArr = Array.isArray(existing.extends) ? existing.extends : [];
    const otherExtends = extendsArr.filter((e) => e !== BIOME_CONFIG_PKG);
    const { $schema: _schema, extends: _extends, ...rest } = existing;
    const semanticKeys = Object.keys(rest);
    if (otherExtends.length === 0 && semanticKeys.length === 0) {
      files.push({ kind: "delete", path: BIOME_JSON });
    } else {
      const edits = [{ op: "exclude" as const, path: "/extends", value: BIOME_CONFIG_PKG }];
      if (otherExtends.length === 0) {
        edits.push({ op: "unset" as const, path: "/extends" } as never);
      }
      files.push({ kind: "edit-json", path: BIOME_JSON, edits });
    }
  }

  return { removeDependencies, files };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const biome = definePlugin({
  apiVersion: 1,
  name: "biome",
  color: biomeColor,
  install,
  uninstall,
  services: ({ shell }) => {
    const biome = new BiomeService(shell);
    return { lint: biome, format: biome, jscheck: biome };
  },
});

export default biome;
