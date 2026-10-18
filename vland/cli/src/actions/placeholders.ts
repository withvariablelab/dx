import fs from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { createPkg, type Pkg } from "@variablelab/clibuddy";
import { logger } from "#src/services/logger.ts";
import { LIBRARY_SCOPES, type TemplateName, type Visibility } from "./template.ts";

type PackageJson = Pkg["packageJson"];

export type Placeholders = {
  projectName: string;
  author: string;
  year: string;
  packageName: string;
  githubOwner: string;
};

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".html",
  ".sh",
  ".env",
  ".gitignore",
  ".gitattributes",
  ".npmrc",
  ".nvmrc",
  ".node-version",
  ".dockerignore",
  ".editorconfig",
  ".prettierrc",
]);

const TEXT_FILENAMES = new Set([
  "Dockerfile",
  "LICENSE",
  "README",
  "CHANGELOG",
  ".gitignore",
  ".gitattributes",
  ".npmrc",
  ".nvmrc",
  ".node-version",
  ".dockerignore",
  ".editorconfig",
  ".prettierrc",
  "lefthook.yml",
  "mise.toml",
]);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".turbo", ".next", "build", "coverage"]);

function isTextFile(name: string) {
  if (TEXT_FILENAMES.has(name)) return true;
  return TEXT_EXTENSIONS.has(extname(name));
}

async function walk(root: string, onFile: (path: string) => Promise<void>) {
  const entries = await readdir(root, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(root, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) return;
        await walk(full, onFile);
        return;
      }
      if (entry.isFile()) {
        await onFile(full);
      }
    }),
  );
}

function applyPlaceholders(content: string, values: Placeholders) {
  return content
    .replaceAll("{{projectName}}", values.projectName)
    .replaceAll("{{author}}", values.author)
    .replaceAll("{{year}}", values.year)
    .replaceAll("{{packageName}}", values.packageName)
    .replaceAll("{{githubOwner}}", values.githubOwner);
}

export async function replacePlaceholders(rootDir: string, values: Placeholders) {
  const debug = logger.subdebug("placeholders");
  let touched = 0;

  await walk(rootDir, async (filePath) => {
    const name = filePath.split("/").pop() ?? "";
    if (!isTextFile(name)) return;

    const fileStat = await stat(filePath);
    if (fileStat.size > 1_000_000) return; // skip files >1MB; templates shouldn't have those

    const original = await readFile(filePath, "utf8");
    const replaced = applyPlaceholders(original, values);
    if (replaced !== original) {
      await writeFile(filePath, replaced);
      touched += 1;
    }
  });

  debug("placeholders applied to %d file(s)", touched);
  return { touched };
}

export type ApplyRootPackageOptions = {
  template: TemplateName;
  projectName: string;
  visibility?: Visibility;
};

/**
 * The root package's name:
 * - `library` private → `@variableland/<projectName>`
 * - `library` public  → `@variablelab/<projectName>`
 * - `backend`, `monorepo` → `<projectName>`
 */
export function rootPackageName({ template, projectName, visibility }: ApplyRootPackageOptions): string {
  return template === "library" ? `${LIBRARY_SCOPES[visibility ?? "public"]}/${projectName}` : projectName;
}

/**
 * Sets `private: true` right after `version`, where package.json sorters
 * (oxfmt's among them) put it, so the file passes their format check as
 * generated. Mutates in place: a copy would drop the formatting pkg-types
 * remembers on the object.
 */
function setPrivate(packageJson: PackageJson): void {
  const keys = Object.keys(packageJson);
  const moved = keys
    .slice(keys.indexOf("version") + 1)
    .filter((key) => key !== "private")
    .map((key) => [key, packageJson[key]] as const);
  for (const [key] of moved) delete packageJson[key];
  delete packageJson.private;
  packageJson.private = true;
  for (const [key, value] of moved) packageJson[key] = value;
}

/**
 * Writes the root `package.json`'s `name` ({@link rootPackageName}) and
 * `private` fields based on the chosen template and visibility. Uses
 * `pkg-types` so field ordering and JSON formatting survive. `private: true`
 * goes on a private library and on every backend and monorepo root, which
 * never publishes.
 */
export async function applyRootPackage(rootDir: string, options: ApplyRootPackageOptions) {
  const debug = logger.subdebug("apply-root-package");

  const rootPath = fs.realpathSync(rootDir);
  const pkg = await createPkg(rootPath);
  if (!pkg) throw new Error("Could not find package.json");

  const { template, visibility } = options;

  try {
    pkg.packageJson.name = rootPackageName(options);
    if (template !== "library" || visibility === "private") setPrivate(pkg.packageJson);
    await pkg.write(pkg.packageJson);
  } catch (error) {
    debug("skipped %s", error);
  }
}
