import path from "node:path";
import * as clack from "@clack/prompts";
import { detectPackageManager, removeDependency } from "nypm";
import { ConfirmationRequiredError } from "#src/errors/confirmation-required.ts";
import { PLUGINS_DIRECTORY, type PluginName } from "#src/lib/plugin/directory.ts";
import type { UninstallResult } from "#src/lib/plugin/types.ts";
import { withSpinner } from "#src/render/steps.ts";
import { ConfigAstService } from "#src/services/config-ast.ts";
import type { ContextValue } from "#src/services/context.ts";
import { applyFileOp, describeFileOp } from "#src/services/file-ops.ts";
import { logger } from "#src/services/logger.ts";
import { canPrompt, createClackPrompts } from "#src/services/prompts.ts";
import { describeWorkspaceChoice, resolveWorkspaceChoice, toNypmWorkspace } from "#src/services/workspace-target.ts";
import { hasInPackageJson, type PluginModule, type RemoveOptions, reportFileOp } from "./shared.ts";

export type RemovePluginActionConfig = {
  ctx: ContextValue;
  args: { name: PluginName };
  options: RemoveOptions;
};

export async function removePluginAction({ ctx, args, options }: RemovePluginActionConfig): Promise<void> {
  const { name } = args;
  const { pkg: pkgName, name: binding } = PLUGINS_DIRECTORY[name];

  clack.intro(` rr plugins remove ${name} `);

  const ast = new ConfigAstService();
  const loaded = await ast.load(ctx.appPkg.dirPath);
  const inConfig = !loaded.isNew && ast.hasPlugin(loaded.mod, binding);

  // Collect plugin's uninstall plan (only if pkg is installed + has uninstall hook).
  let uninstallResult: UninstallResult | undefined;
  if (hasInPackageJson(ctx, pkgName)) {
    try {
      const mod = (await import(pkgName)) as PluginModule;
      const factory = mod.default;
      const plugin = typeof factory === "function" ? factory() : undefined;
      if (plugin?.uninstall) {
        uninstallResult = await plugin.uninstall({
          shell: ctx.shell,
          logger,
          appPkg: ctx.appPkg,
          prompts: createClackPrompts(),
          flags: { yes: !!options.yes, nonInteractive: !!options.yes || !canPrompt() },
        });
      }
    } catch (err) {
      clack.log.warn(`Could not load ${pkgName} for uninstall hook: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const planSteps: string[] = [];
  if (inConfig) {
    const rel = path.relative(ctx.appPkg.dirPath, loaded.filepath) || loaded.filepath;
    planSteps.push(`Remove ${binding}() from ${rel}`);
  }
  for (const op of uninstallResult?.files ?? []) {
    planSteps.push(describeFileOp(op));
  }
  const depsToRemove = (uninstallResult?.removeDependencies ?? []).filter((dep) => hasInPackageJson(ctx, dep));
  if (hasInPackageJson(ctx, pkgName) && !depsToRemove.includes(pkgName)) {
    depsToRemove.unshift(pkgName);
  }
  const pm = await detectPackageManager(ctx.appPkg.dirPath);
  const wsChoice = resolveWorkspaceChoice(ctx.appPkg, pm);
  const workspace = toNypmWorkspace(wsChoice);

  if (depsToRemove.length > 0) {
    planSteps.push(`Uninstall: ${depsToRemove.join(", ")} (from ${describeWorkspaceChoice(wsChoice)})`);
  }

  if (planSteps.length === 0) {
    clack.log.warn(`Plugin '${name}' is not installed nor configured.`);
    clack.outro("Nothing to do.");
    return;
  }

  clack.log.message(`Plan:\n${planSteps.map((s) => `  • ${s}`).join("\n")}`);

  if (options.dryRun) {
    clack.outro("Dry run complete.");
    return;
  }

  if (!options.yes) {
    // Removing deletes files and dependencies: without a terminal to confirm in, insist on --yes.
    if (!canPrompt()) throw new ConfirmationRequiredError(`rr plugins remove ${name}`);
    const choice = await clack.confirm({ message: "Proceed?", initialValue: false });
    if (clack.isCancel(choice) || choice !== true) {
      clack.outro("Aborted.");
      return;
    }
  }

  // Apply file ops first (they may need the plugin's source to still be importable).
  for (const op of uninstallResult?.files ?? []) {
    reportFileOp(await applyFileOp(ctx.appPkg.dirPath, op, /* force */ true));
  }
  if (inConfig) {
    ast.removePlugin(loaded.mod, binding);
    await ast.save(loaded);
    const rel = path.relative(ctx.appPkg.dirPath, loaded.filepath) || loaded.filepath;
    clack.log.success(`Removed ${binding}() from ${rel}`);
  }
  for (const dep of depsToRemove) {
    await withSpinner(`Uninstalling ${dep}`, async () => {
      await removeDependency(dep, { cwd: ctx.appPkg.dirPath, silent: true, workspace });
    });
  }

  clack.outro(`Plugin '${name}' removed.`);
}
