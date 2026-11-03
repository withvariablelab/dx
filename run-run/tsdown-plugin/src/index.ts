import fs from "node:fs/promises";
import path from "node:path";
import {
  decideScaffold,
  definePlugin,
  type InstallContext,
  type InstallResult,
  pickPreset,
  ToolService,
  type UninstallContext,
  type UninstallResult,
} from "@rrlab/cli/plugin";
import { colorize, type ShellService } from "@variablelab/clibuddy";
import { generateCode, type ProxifiedModule, parseModule } from "magicast";
import { TOOL_VERSIONS } from "./tool-versions.ts";

export { TOOL_VERSIONS } from "./tool-versions.ts";

const FROM = import.meta.url;
const CONFIG_PKG = "@rrlab/tsdown-config";
const DEFAULT_CONFIG_FILENAME = "tsdown.config.ts";
const CONFIG_FILENAMES = [
  "tsdown.config.ts",
  "tsdown.config.mts",
  "tsdown.config.cts",
  "tsdown.config.js",
  "tsdown.config.mjs",
  "tsdown.config.cjs",
] as const;

type Preset = "lib" | "bin";
type FactoryName = "defineLibConfig" | "defineBinConfig";

type PresetInfo = {
  factory: FactoryName;
  label: string;
};

const PRESETS: Record<Preset, PresetInfo> = {
  lib: { factory: "defineLibConfig", label: "Library (dts on, entry src/index.ts)" },
  bin: { factory: "defineBinConfig", label: "CLI / Node binary (entry src/run.ts)" },
};
const DEFAULT_PRESET: Preset = "lib";
const tsdownColor = colorize("#FF7E18");

export class TsdownService extends ToolService {
  constructor(shellService: ShellService) {
    super({ bin: "tsdown", color: tsdownColor, shellService, from: FROM });
  }

  async pack() {
    return this.runReport();
  }
}

/**
 * tsdown needs `typescript` installed to write declarations (the `lib`
 * preset's `dts: true`, or a `types` entry in package.json), but takes it only
 * as an optional peer. A package that already installs it (`dependencies` or
 * `devDependencies`; a peer alone isn't installed) keeps the range it has.
 */
function toolDependencies(pkg: InstallContext["appPkg"]): Record<string, string> {
  const { dependencies, devDependencies } = pkg.packageJson;
  const installsTypescript = [dependencies, devDependencies].some((deps) => !!deps && "typescript" in deps);
  return installsTypescript
    ? { tsdown: TOOL_VERSIONS.tsdown.install }
    : { tsdown: TOOL_VERSIONS.tsdown.install, typescript: TOOL_VERSIONS.typescript.install };
}

export async function install(ctx: InstallContext): Promise<InstallResult> {
  const existingPath = await findExistingConfig(ctx.appPkg.dirPath);
  const action = await decideScaffold(ctx, {
    label: existingPath ? path.relative(ctx.appPkg.dirPath, existingPath) : DEFAULT_CONFIG_FILENAME,
    fileExists: existingPath !== null,
    patchHint: `rewrite to use ${CONFIG_PKG}, keep my options`,
    unattendedExistingAction: "skip",
  });

  if (action === "skip") {
    return { devDependencies: toolDependencies(ctx.appPkg) };
  }

  const preset = await pickPreset(ctx, {
    message: "Which kind of build?",
    presets: PRESETS,
    defaultPreset: DEFAULT_PRESET,
  });
  const { factory } = PRESETS[preset];

  const devDependencies: Record<string, string> = {
    ...toolDependencies(ctx.appPkg),
    [CONFIG_PKG]: await ctx.release.resolve(CONFIG_PKG),
  };

  if (action === "create" || action === "overwrite") {
    const relPath = existingPath ? path.relative(ctx.appPkg.dirPath, existingPath) : DEFAULT_CONFIG_FILENAME;
    return {
      devDependencies,
      files: [
        {
          kind: "create",
          path: relPath,
          content: renderScaffold(factory),
          overwrite: action === "overwrite" || ctx.flags.force,
        },
      ],
    };
  }

  // action === "patch": rewrite the existing config to use our factory.
  const relPath = path.relative(ctx.appPkg.dirPath, existingPath as string);
  return {
    devDependencies,
    files: [
      {
        kind: "edit-text",
        path: relPath,
        edit: (src) => patchToFactory(src, factory),
      },
    ],
  };
}

export async function uninstall(ctx: UninstallContext): Promise<UninstallResult> {
  // `typescript` stays: the project or another plugin (ts, astro) may use it.
  const removeDependencies = ["tsdown", CONFIG_PKG];
  const existingPath = await findExistingConfig(ctx.appPkg.dirPath);
  if (!existingPath) return { removeDependencies };

  let source: string;
  try {
    source = await fs.readFile(existingPath, "utf8");
  } catch {
    return { removeDependencies };
  }

  let mod: ProxifiedModule;
  try {
    mod = parseModule(source);
  } catch {
    return { removeDependencies };
  }

  const scaffold = readScaffoldFactory(mod);
  if (!scaffold) {
    // Not a file we wrote — leave it alone, only drop deps.
    return { removeDependencies };
  }

  const relPath = path.relative(ctx.appPkg.dirPath, existingPath);
  if (!scaffold.hasArgs) {
    // Pure scaffold (no user options) → safe to remove the file.
    return { removeDependencies, files: [{ kind: "delete", path: relPath }] };
  }

  // The user added options after we scaffolded. Rewrite the file back to a
  // bare `defineConfig` so they keep their options but the file no longer
  // depends on the package we're removing.
  return {
    removeDependencies,
    files: [{ kind: "edit-text", path: relPath, edit: (src) => patchBackToDefineConfig(src) }],
  };
}

async function findExistingConfig(cwd: string): Promise<string | null> {
  for (const name of CONFIG_FILENAMES) {
    const candidate = path.join(cwd, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

function renderScaffold(factory: FactoryName): string {
  return `import { ${factory} } from "${CONFIG_PKG}";\n\nexport default ${factory}();\n`;
}

/**
 * Rewrites a user-owned `tsdown.config.*` to use one of our factories,
 * preserving the call's arguments. Throws when the default export is not a
 * direct call to `defineConfig` from `tsdown` or one of our factories — we
 * refuse to mutate shapes we don't recognise.
 */
function patchToFactory(source: string, factory: FactoryName): string {
  const mod = parseModule(source);
  const def = readDefaultCall(mod);
  if (!def) {
    throw new Error(
      `Cannot patch tsdown config: default export is not a direct function call. Expected \`defineConfig(...)\` from "tsdown" or one of: ${ourFactoryList()}.`,
    );
  }
  if (def.callee !== "defineConfig" && !isOurFactory(def.callee)) {
    throw new Error(
      `Cannot patch tsdown config: default export calls \`${def.callee}()\`. Expected \`defineConfig()\` from "tsdown" or one of: ${ourFactoryList()}.`,
    );
  }

  // Swap import + callee. `defineConfig` came from "tsdown"; our factories
  // come from "@rrlab/tsdown-config". Removing first guards against ending up
  // with both bindings in scope when the user is switching presets.
  removeImport(mod, def.callee);
  addImport(mod, factory, CONFIG_PKG);
  setCalleeName(mod, factory);

  return generateCode(mod).code;
}

/**
 * Reverses `patchToFactory`. Swaps our factory call + import back to
 * `defineConfig` from "tsdown", preserving the user's arguments. Used by
 * uninstall when the scaffolded file has been customised.
 */
function patchBackToDefineConfig(source: string): string {
  const mod = parseModule(source);
  const def = readDefaultCall(mod);
  if (!def || !isOurFactory(def.callee)) {
    return source;
  }
  removeImport(mod, def.callee);
  addImport(mod, "defineConfig", "tsdown");
  setCalleeName(mod, "defineConfig");
  return generateCode(mod).code;
}

function readScaffoldFactory(mod: ProxifiedModule): { factory: FactoryName; hasArgs: boolean } | null {
  const def = readDefaultCall(mod);
  if (!def || !isOurFactory(def.callee)) return null;
  const imp = mod.imports[def.callee];
  if (!imp || imp.from !== CONFIG_PKG) return null;
  return { factory: def.callee, hasArgs: def.hasArgs };
}

type DefaultCallInfo = { callee: string; hasArgs: boolean };

function readDefaultCall(mod: ProxifiedModule): DefaultCallInfo | null {
  // biome-ignore lint/suspicious/noExplicitAny: magicast proxies are opaque
  const def = (mod.exports as any).default;
  if (def?.$type !== "function-call") return null;
  const callee = def.$callee;
  if (typeof callee !== "string") return null;
  // `$args` is a ProxifiedArray (not a real Array) — guard on `.length` not `Array.isArray`.
  const args = def.$args;
  return { callee, hasArgs: !!args && args.length > 0 };
}

function isOurFactory(name: string): name is FactoryName {
  return name === "defineLibConfig" || name === "defineBinConfig";
}

function ourFactoryList(): string {
  return Object.values(PRESETS)
    .map((p) => `\`${p.factory}\``)
    .join(", ");
}

function removeImport(mod: ProxifiedModule, local: string): void {
  if (mod.imports[local]) {
    delete mod.imports[local];
  }
}

function addImport(mod: ProxifiedModule, local: string, from: string): void {
  if (!mod.imports[local]) {
    mod.imports.$add({ from, imported: local, local });
  }
}

/**
 * Renames the default export's callee identifier in-place. magicast's
 * `$callee` is a string snapshot taken at proxy creation, so we mutate the
 * underlying AST node directly — `generateCode` reads from the AST.
 */
function setCalleeName(mod: ProxifiedModule, newName: string): void {
  // biome-ignore lint/suspicious/noExplicitAny: magicast proxies expose $ast
  const def = (mod.exports as any).default;
  const ast = def?.$ast;
  if (ast?.callee?.type !== "Identifier") {
    throw new Error("Cannot rename callee: default export is not a simple identifier call.");
  }
  ast.callee.name = newName;
}

const tsdown = definePlugin({
  apiVersion: 1,
  name: "tsdown",
  color: tsdownColor,
  install,
  uninstall,
  services: ({ shell }) => ({ pack: new TsdownService(shell) }),
});

export default tsdown;
