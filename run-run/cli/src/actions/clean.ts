import { rm } from "node:fs/promises";
import path from "node:path";
import { cwd } from "@variablelab/clibuddy";
import { type GlobOptionsWithFileTypesFalse, glob } from "glob";
import { logger } from "#src/services/logger.ts";

export type CleanOptions = {
  onlyDist: boolean;
  dryRun: boolean;
};

export type CleanActionConfig = {
  options: CleanOptions;
};

export async function cleanAction({ options }: CleanActionConfig): Promise<void> {
  async function run(paths: string[], globOptions: GlobOptionsWithFileTypesFalse) {
    const toDelete = await glob(paths, globOptions);

    if (options.dryRun) {
      logger.info("Paths that would be deleted: %O", toDelete);
      return;
    }

    logger.start("Clean started");
    // One match can sit inside another (node_modules/dep/dist): force makes a path already deleted a no-op.
    for (const match of toDelete) {
      await rm(path.resolve(cwd, match), { recursive: true, force: true });
    }
    logger.success("Clean completed");
  }

  const BUILD_PATHS = ["**/dist"];
  const ALL_DIRTY_PATHS = ["**/.turbo", "**/node_modules", "pnpm-lock.yaml", "bun.lock", ...BUILD_PATHS];

  if (options.onlyDist) {
    await run(BUILD_PATHS, { cwd, ignore: ["**/node_modules/**"] });
  } else {
    await run(ALL_DIRTY_PATHS, { cwd });
  }
}
