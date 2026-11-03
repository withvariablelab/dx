import { cwd } from "@variablelab/clibuddy";
import { type GlobOptionsWithFileTypesFalse, glob } from "glob";
import { rimraf } from "rimraf";
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
    await rimraf(toDelete);
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
