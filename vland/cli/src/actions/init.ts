import { readdir } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { cancel, confirm, intro, isCancel, log, outro, select, spinner, text } from "@clack/prompts";
import { hasTTY, palette } from "@variablelab/clibuddy";
import { installDependencies } from "nypm";
import type { Context } from "#src/services/ctx.ts";
import { logger } from "#src/services/logger.ts";
import { applyRootPackage, replacePlaceholders, rootPackageName } from "./placeholders.ts";
import { fetchTemplate, GITHUB_OWNERS, TEMPLATE_META, TEMPLATES, type TemplateName, type Visibility } from "./template.ts";

export type InitOptions = {
  name?: string;
  template?: TemplateName;
  visibility?: Visibility;
  dir?: string;
  install?: boolean;
  git?: boolean;
  force: boolean;
};

const PACKAGE_MANAGER = "pnpm" as const;

const NPM_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function validateProjectName(name: string): string | undefined {
  if (!name?.trim()) return "Name is required.";
  if (/\s/.test(name)) return "Name cannot contain whitespace.";
  if (name.startsWith(".") || name.startsWith("/") || name.startsWith("\\")) {
    return "Name cannot start with '.', '/' or '\\'.";
  }
  if (name.includes("..")) return "Name cannot contain '..'.";
  if (!NPM_NAME_RE.test(name)) {
    return "Name must be a valid npm package name (lowercase, no spaces).";
  }
  return undefined;
}

async function isDirEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
}

type GitIdentity = { name: string; email: string };

const FALLBACK_GIT_IDENTITY: GitIdentity = { name: "vland", email: "noreply@variable.land" };

/** The `user.name` and `user.email` git resolves from the shell's cwd. Each is empty when unset. */
async function readGitIdentity(shell: Context["shell"]): Promise<GitIdentity> {
  try {
    const [name, email] = await Promise.all([
      shell.runCaptured("git", ["config", "--get", "user.name"], { throwOnError: false }),
      shell.runCaptured("git", ["config", "--get", "user.email"], { throwOnError: false }),
    ]);
    return { name: name.stdout.trim(), email: email.stdout.trim() };
  } catch {
    return { name: "", email: "" };
  }
}

async function readGitAuthor(shell: Context["shell"]): Promise<string | undefined> {
  const { name, email } = await readGitIdentity(shell);
  if (!name) return undefined;
  return email ? `${name} <${email}>` : name;
}

/**
 * `-c` flags that fill in only the half of the identity git can't resolve. A
 * configured identity is left alone, so `commit.gpgsign` signs with the user's
 * own email.
 */
async function gitIdentityFallbackArgs(shell: Context["shell"]): Promise<string[]> {
  const { name, email } = await readGitIdentity(shell);
  return [
    ...(name ? [] : ["-c", `user.name=${FALLBACK_GIT_IDENTITY.name}`]),
    ...(email ? [] : ["-c", `user.email=${FALLBACK_GIT_IDENTITY.email}`]),
  ];
}

function abort(message: string): never {
  cancel(message);
  process.exit(1);
}

export async function runInit(ctx: Context, options: InitOptions) {
  const debug = logger.subdebug("init");
  debug("options: %O", options);

  const shell = ctx.shell;

  intro(`${palette.label(" vland init ")}`);

  let template = options.template;
  if (!template) {
    if (!hasTTY) abort("Template is required in non-interactive environments. Use --template <library|backend|monorepo>.");
    const choice = await select({
      message: "Pick a template",
      options: TEMPLATES.map((value) => ({
        value,
        label: value,
      })),
    });
    if (isCancel(choice)) abort("Cancelled.");
    template = choice as TemplateName;
  }

  let name = options.name;
  if (!name) {
    if (!hasTTY) abort("Project name is required in non-interactive environments. Pass it as the first argument.");
    const value = await text({
      message: "Project name",
      placeholder: TEMPLATE_META[template].placeholder,
      validate: (input) => validateProjectName(input ?? ""),
    });
    if (isCancel(value)) abort("Cancelled.");
    name = value as string;
  }
  const nameError = validateProjectName(name);
  if (nameError) abort(nameError);

  // Visibility only meaningfully changes the library template (scope +
  // private flag). For backend/monorepo we ignore it — those are always
  // private at root. Prompt for it interactively when building a library
  // and the user didn't pass --visibility; non-interactive default is
  // "public" (the OSS-style scope, @variablelab).
  let visibility = options.visibility;
  if (template === "library" && !visibility) {
    if (!hasTTY) {
      visibility = "public";
    } else {
      const choice = await select<Visibility>({
        message: "Library visibility",
        options: [
          { value: "public", label: "public (@variablelab/<name>)" },
          { value: "private", label: "private (@variableland/<name>, private: true)" },
        ],
        initialValue: "public",
      });
      if (isCancel(choice)) abort("Cancelled.");
      visibility = choice as Visibility;
    }
  }

  const dir = options.dir
    ? isAbsolute(options.dir)
      ? options.dir
      : resolve(process.cwd(), options.dir)
    : resolve(process.cwd(), name);
  debug("target dir: %s", dir);

  if (!(await isDirEmpty(dir)) && !options.force) {
    abort(`Target directory ${palette.highlight(dir)} is not empty. Re-run with ${palette.highlight("--force")} to overwrite.`);
  }

  let author = await readGitAuthor(shell);
  if (!author) {
    if (!hasTTY) {
      author = "";
    } else {
      const value = await text({
        message: "Author (used in package.json / LICENSE)",
        placeholder: "Jane Doe <jane@example.com>",
        defaultValue: "",
      });
      if (isCancel(value)) abort("Cancelled.");
      author = (value as string) || "";
    }
  }
  debug("author: %s", author || "<empty>");

  const fetchSpin = spinner();
  fetchSpin.start(`Fetching ${palette.highlight(template)} template`);
  try {
    const { source } = await fetchTemplate({ template, dir, force: options.force });
    fetchSpin.stop(`Fetched template from ${palette.dim(source)}`);
  } catch (error) {
    fetchSpin.stop("Failed to fetch template", 1);
    throw error;
  }

  const placeholderSpin = spinner();
  placeholderSpin.start("Applying placeholders");
  await replacePlaceholders(dir, {
    projectName: name,
    author,
    year: new Date().getFullYear().toString(),
    packageName: rootPackageName({ template, projectName: name, visibility }),
    // Only a library picks its visibility: backend and monorepo roots are always private.
    githubOwner: GITHUB_OWNERS[template === "library" ? (visibility ?? "public") : "private"],
  });
  await applyRootPackage(dir, { template, projectName: name, visibility });
  placeholderSpin.stop("Placeholders applied");

  const shouldInstall = await resolveYesNo(options.install, "Install dependencies?");
  const shouldGit = await resolveYesNo(options.git, "Initialise a git repository?");

  const gitShell = shell.at(dir);
  let gitInitError: unknown;
  if (shouldGit) {
    // Before the install, so a postinstall that sets up git hooks (lefthook's) finds the repo.
    try {
      await gitShell.runCaptured("git", ["init"]);
    } catch (error) {
      gitInitError = error;
    }
  }

  if (shouldInstall) {
    const installSpin = spinner();
    installSpin.start(`Installing dependencies with ${palette.highlight(PACKAGE_MANAGER)}`);
    try {
      await installDependencies({
        cwd: dir,
        packageManager: { name: PACKAGE_MANAGER, command: PACKAGE_MANAGER },
        silent: true,
      });
      installSpin.stop(`Installed with ${palette.highlight(PACKAGE_MANAGER)}`);
    } catch (error) {
      installSpin.stop("Failed to install dependencies", 1);
      log.warn(`You can install manually later with \`cd <dir> && ${PACKAGE_MANAGER} install\`.`);
      debug("install error: %O", error);
    }
  } else {
    log.info(`Skipping ${palette.highlight("install")}.`);
  }

  if (shouldGit) {
    const gitSpin = spinner();
    gitSpin.start("Initialising git repository");
    try {
      if (gitInitError) throw gitInitError;
      await gitShell.runCaptured("git", ["add", "-A"]);
      // Read after `git init`, so an `includeIf "gitdir:…"` identity for the new repo applies.
      const identityArgs = await gitIdentityFallbackArgs(gitShell);
      // --no-verify: the hooks the install just set up are for the user's commits, not the template as generated.
      await gitShell.runCaptured("git", [...identityArgs, "commit", "--no-verify", "-m", "chore: initial commit from vland"]);
      gitSpin.stop("Initialised git repository");
    } catch (error) {
      gitSpin.stop("Failed to initialise git", 1);
      debug("git error: %O", error);
    }
  } else {
    log.info(`Skipping ${palette.highlight("git init")}.`);
  }

  const runScript = TEMPLATE_META[template].runScript;
  outro(
    [
      palette.success("Done!"),
      "",
      palette.dim("Next steps:"),
      `  cd ${name}`,
      shouldInstall ? `  ${PACKAGE_MANAGER} ${runScript}` : `  ${PACKAGE_MANAGER} install && ${PACKAGE_MANAGER} ${runScript}`,
    ].join("\n"),
  );
}

async function resolveYesNo(explicit: boolean | undefined, message: string): Promise<boolean> {
  if (typeof explicit === "boolean") return explicit;
  if (!hasTTY) return true;
  const value = await confirm({ message, initialValue: true });
  if (isCancel(value)) abort("Cancelled.");
  return value as boolean;
}
