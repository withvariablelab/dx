import {
  definePlugin,
  type FormatOptions,
  type Formatter,
  type InstallContext,
  type InstallResult,
  type Linter,
  type LintOptions,
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
const oxcColor = colorize("#32F3E9");

export class OxlintService extends ToolService implements Linter {
  constructor(shellService: ShellService) {
    super({ bin: "oxlint", color: oxcColor, shellService, from: FROM });
  }

  async lint(options: LintOptions): Promise<RunReport> {
    // oxlint checks by default; it has no `--check` flag.
    return this.runReport(["--report-unused-disable-directives", ...(options.fix ? ["--fix"] : [])]);
  }
}

export class OxfmtService extends ToolService implements Formatter {
  constructor(shellService: ShellService) {
    super({ bin: "oxfmt", color: oxcColor, shellService, from: FROM });
  }

  async format(options: FormatOptions): Promise<RunReport> {
    return this.runReport(["--no-error-on-unmatched-pattern", options.fix ? "--write" : "--check"]);
  }
}

export class OxlintTypeCheckService extends ToolService implements TypeChecker {
  constructor(shellService: ShellService) {
    super({ bin: "oxlint", color: oxcColor, shellService, from: FROM });
  }

  async check(options: TypeCheckOptions = {}): Promise<RunReport> {
    return this.runReport(["--type-aware", "--type-check"], { cwd: options.cwd });
  }
}

export async function install(_ctx: InstallContext): Promise<InstallResult> {
  return {
    devDependencies: {
      oxlint: TOOL_VERSIONS.oxlint.install,
      oxfmt: TOOL_VERSIONS.oxfmt.install,
      "oxlint-tsgolint": TOOL_VERSIONS["oxlint-tsgolint"].install,
    },
  };
}

export async function uninstall(_ctx: UninstallContext): Promise<UninstallResult> {
  return { removeDependencies: ["oxlint", "oxfmt", "oxlint-tsgolint"] };
}

const oxc = definePlugin({
  apiVersion: 1,
  name: "oxc",
  color: oxcColor,
  install,
  uninstall,
  services: ({ shell }) => ({
    lint: new OxlintService(shell),
    format: new OxfmtService(shell),
    typecheck: new OxlintTypeCheckService(shell),
  }),
});

export default oxc;
