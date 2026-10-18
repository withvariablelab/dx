import path from "node:path";
import * as clack from "@clack/prompts";
import { addDependency, detectPackageManager, removeDependency } from "nypm";
import { InvalidPluginModuleError } from "#src/errors/invalid-plugin-module.ts";
import { UnknownPluginError } from "#src/errors/unknown-plugin.ts";
import { PLUGINS_DIRECTORY, type PluginName } from "#src/lib/plugin/directory.ts";
import type { InstallContext, InstallResult } from "#src/lib/plugin/types.ts";
import { withSpinner } from "#src/render/steps.ts";
import { ConfigAstService } from "#src/services/config-ast.ts";
import type { ContextValue } from "#src/services/context.ts";
import { applyFileOp } from "#src/services/file-ops.ts";
import { logger } from "#src/services/logger.ts";
import { canPrompt, createClackPrompts } from "#src/services/prompts.ts";
import { ReleaseService } from "#src/services/release.ts";
import { describeWorkspaceChoice, resolveWorkspaceChoice, toNypmWorkspace } from "#src/services/workspace-target.ts";
import { type AddOptions, hasInPackageJson, type PluginModule, reportFileOp } from "./shared.ts";

/** Split a `<name>[@<spec>]` input (e.g. `biome@pr-226`) into the plugin name and optional spec. */
function parsePluginSpec(input: string): { name: string; spec?: string } {
  const at = input.indexOf("@");
  if (at <= 0) return { name: input };
  return { name: input.slice(0, at), spec: input.slice(at + 1) };
}

/** A dist-tag starts with a letter and contains only safe identifier chars. Version ranges (`^0.1`, `>=1`, `0.0.2`, `*`) don't match. */
function isDistTag(spec: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(spec) && spec !== "latest";
}

export type AddPluginActionConfig = {
  ctx: ContextValue;
  args: { name: PluginName };
  options: AddOptions;
};

export async function addPluginAction({ ctx, args, options }: AddPluginActionConfig): Promise<void> {
  const { name: pluginName, spec } = parsePluginSpec(args.name);
  if (!(pluginName in PLUGINS_DIRECTORY)) {
    throw new UnknownPluginError(pluginName);
  }
  const { pkg: pkgName, name: binding } = PLUGINS_DIRECTORY[pluginName as PluginName];
  const tag = spec && isDistTag(spec) ? spec : undefined;
  const installSpec = spec ? `${pkgName}@${spec}` : pkgName;

  clack.intro(` rr plugins add ${args.name} `);

  const inPkg = hasInPackageJson(ctx, pkgName);
  const ast = new ConfigAstService();
  const loaded = await ast.load(ctx.appPkg.dirPath);
  const inConfig = !loaded.isNew && ast.hasPlugin(loaded.mod, binding);

  if (inPkg && inConfig && !options.force && !spec) {
    clack.log.warn(`${pkgName} is already installed and configured. Use --force to re-run install.`);
    clack.outro("Nothing to do.");
    return;
  }

  const pm = await detectPackageManager(ctx.appPkg.dirPath);
  const wsChoice = resolveWorkspaceChoice(ctx.appPkg, pm);
  const workspace = toNypmWorkspace(wsChoice);
  const targetLabel = describeWorkspaceChoice(wsChoice);
  // A spec means "(re)install at this spec" — upgrade even when the package is already in package.json.
  const willInstall = !inPkg || !!spec;

  if (options.dryRun) {
    const presence = willInstall
      ? inPkg
        ? " (already present, will be updated to this spec)"
        : ""
      : " (already present, skipped)";
    clack.log.info(`Would: install ${installSpec} as a devDependency in ${targetLabel}${presence}.`);
    if (!inConfig) {
      const rel = path.relative(ctx.appPkg.dirPath, loaded.filepath) || loaded.filepath;
      clack.log.info(`Would: add ${binding}() to ${rel} (plugins[]).`);
    }
    clack.log.info("Would: run the plugin's install() hook (if any) to fetch peer deps and create files.");
    clack.outro("Dry run complete.");
    return;
  }

  let installedNow = false;
  if (willInstall) {
    await withSpinner(`Installing ${installSpec}`, async () => {
      await addDependency([installSpec], { cwd: ctx.appPkg.dirPath, dev: true, silent: true, workspace });
    });
    // Only mark for rollback when this was a fresh install — a failed upgrade can't be safely reverted to the previous version.
    if (!inPkg) installedNow = true;
  }

  let installResult: InstallResult | undefined;
  try {
    const mod = (await import(pkgName)) as PluginModule;
    const factory = mod.default;
    if (typeof factory !== "function") {
      throw new InvalidPluginModuleError(pkgName);
    }
    const plugin = factory();
    if (plugin.install) {
      const installCtx: InstallContext = {
        shell: ctx.shell,
        logger,
        appPkg: ctx.appPkg,
        prompts: createClackPrompts(),
        flags: {
          force: !!options.force,
          yes: !!options.yes,
          nonInteractive: !!options.yes || !canPrompt(),
        },
        release: new ReleaseService(tag),
      };
      installResult = await plugin.install(installCtx);
    }
  } catch (err) {
    if (installedNow) {
      try {
        await removeDependency(pkgName, { cwd: ctx.appPkg.dirPath, silent: true, workspace });
      } catch {
        // best-effort rollback — don't mask the original error
      }
    }
    throw err;
  }

  if (installResult?.devDependencies && Object.keys(installResult.devDependencies).length > 0) {
    const names = Object.keys(installResult.devDependencies);
    const deps = Object.entries(installResult.devDependencies).map(([k, v]) => `${k}@${v}`);
    await withSpinner(`Installing ${names.join(", ")}`, async () => {
      await addDependency(deps, { cwd: ctx.appPkg.dirPath, dev: true, silent: true, workspace });
    });
  }
  for (const op of installResult?.files ?? []) {
    reportFileOp(await applyFileOp(ctx.appPkg.dirPath, op, !!options.force));
  }

  if (!inConfig) {
    ast.addPlugin(loaded.mod, { exportName: binding, pkgName });
    await ast.save(loaded);
    const rel = path.relative(ctx.appPkg.dirPath, loaded.filepath) || loaded.filepath;
    clack.log.success(`Updated ${rel}`);
  }

  clack.outro(`Plugin '${pluginName}' ready 🎉`);
}
