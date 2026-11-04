import { colorize } from "@variablelab/clibuddy";
import { cleanAction } from "#src/actions/clean.ts";
import { createCommand } from "../base.ts";

type Options = {
  onlyDist?: boolean;
  dryRun?: boolean;
};

const globColor = colorize("#7C7270");

export function createCleanCommand() {
  return createCommand("clean")
    .summary("delete dirty files")
    .description("Deletes generated files and folders such as 'dist', 'node_modules', and lock files to ensure a clean state.")
    .option("--only-dist", "delete 'dist' folders only")
    .option("--dry-run", "outputs the paths that would be deleted")
    .action((options: Options) =>
      cleanAction({ options: { onlyDist: Boolean(options.onlyDist), dryRun: Boolean(options.dryRun) } }),
    )
    .addHelpText("after", `\nUnder the hood, this command uses ${globColor("glob")} to find dirty folders or files.`);
}
