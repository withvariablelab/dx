import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { downloadTemplate } from "giget";
import { logger } from "#src/services/logger.ts";

export const TEMPLATES = ["library", "backend", "monorepo"] as const;
export type TemplateName = (typeof TEMPLATES)[number];

export const VISIBILITIES = ["private", "public"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const TEMPLATE_META: Record<TemplateName, { placeholder: string; runScript: string }> = {
  library: { placeholder: "my-lib", runScript: "test" },
  backend: { placeholder: "my-api", runScript: "dev" },
  monorepo: { placeholder: "my-mono", runScript: "dev" },
};

/**
 * The npm scope a `library` template's package is published under, indexed by
 * the user-selected visibility. Public libraries live under the open-source
 * `@variablelab` scope; private libraries under `@variableland`.
 */
export const LIBRARY_SCOPES: Record<Visibility, string> = {
  private: "@variableland",
  public: "@variablelab",
};

/**
 * The GitHub owner of a project's repository, indexed by visibility: public
 * projects live in the open-source `withvariablelab` org, private ones in
 * `variableland`.
 */
export const GITHUB_OWNERS: Record<Visibility, string> = {
  private: "variableland",
  public: "withvariablelab",
};

const GITHUB_SOURCE = "github:withvariablelab/dx";
const GITHUB_REF = "main";

type ResolveOptions = {
  template: TemplateName;
  dir: string;
  force: boolean;
};

/**
 * Resolves the template into `dir`. Source order:
 * 1. `VLAND_TEMPLATES_DIR` env var → copy from local path (used by E2E tests
 *    against the in-repo `vland/templates/`).
 * 2. Otherwise → download via giget from `github:withvariablelab/dx/vland/templates/<name>`.
 */
export async function fetchTemplate(options: ResolveOptions): Promise<{ source: string }> {
  const debug = logger.subdebug("fetch-template");
  const localRoot = process.env.VLAND_TEMPLATES_DIR;

  if (localRoot) {
    const sourceDir = resolve(localRoot, options.template);
    debug("local source: %s", sourceDir);
    await cp(sourceDir, options.dir, {
      recursive: true,
      force: options.force,
      errorOnExist: !options.force,
      filter: (src) => !src.includes("/node_modules") && !src.endsWith("/.turbo") && !src.endsWith("/dist"),
    });
    return { source: sourceDir };
  }

  const source = `${GITHUB_SOURCE}/vland/templates/${options.template}#${GITHUB_REF}`;
  debug("remote source: %s", source);
  const result = await downloadTemplate(source, {
    dir: options.dir,
    force: options.force,
    install: false,
  });
  return { source: result.source };
}
