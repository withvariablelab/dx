import fs from "node:fs/promises";
import path from "node:path";
import { builders, generateCode, loadFile, type ProxifiedModule, parseModule } from "magicast";

const CONFIG_FILENAMES = ["run-run.config.ts", "run-run.config.mts"] as const;

export type PluginEntry = {
  /** Local binding (e.g. `biome` for `import biome from "@rrlab/biome-plugin"`). */
  exportName: string;
  /** Full npm package name (e.g. `@rrlab/biome-plugin`). */
  pkgName: string;
};

export type LoadedConfig = {
  mod: ProxifiedModule;
  filepath: string;
  /** True when we generated a fresh config in memory because none existed on disk. */
  isNew: boolean;
};

/**
 * AST-level read/write for `run-run.config.{ts,mts}`. Wraps `magicast` so that
 * adding/removing a plugin survives formatting, comments, and unrelated config
 * options. The kernel and the `rr plugins add | remove` command use this
 * service exclusively — no regex-based edits.
 */
export class ConfigAstService {
  /**
   * Looks for an existing `run-run.config.{ts,mts}` in `cwd`. If neither
   * exists, returns a fresh magicast module built from a minimal template
   * marked as `isNew: true`; the caller decides where to save it.
   */
  async load(cwd: string): Promise<LoadedConfig> {
    for (const name of CONFIG_FILENAMES) {
      const candidate = path.join(cwd, name);
      try {
        await fs.access(candidate);
        const mod = await loadFile(candidate);
        return { mod, filepath: candidate, isNew: false };
      } catch {
        // try the next candidate
      }
    }
    const filepath = path.join(cwd, "run-run.config.mts");
    return {
      mod: parseModule(MINIMAL_TEMPLATE),
      filepath,
      isNew: true,
    };
  }

  async save(loaded: LoadedConfig): Promise<void> {
    await fs.writeFile(loaded.filepath, tidy(generateCode(loaded.mod).code), "utf8");
  }

  /**
   * Returns true when the config's `plugins` array contains a call to the
   * given `exportName` (e.g. `biome()`).
   */
  hasPlugin(mod: ProxifiedModule, exportName: string): boolean {
    const plugins = this.#pluginsArray(mod);
    if (!plugins) return false;
    for (let i = 0; i < plugins.length; i++) {
      const item = plugins[i];
      if (this.#isCallTo(item, exportName)) return true;
    }
    return false;
  }

  /**
   * Adds the import binding and pushes a `exportName()` call onto `plugins`.
   * No-op when the call is already present (idempotent).
   */
  addPlugin(mod: ProxifiedModule, entry: PluginEntry): { changed: boolean } {
    if (this.hasPlugin(mod, entry.exportName)) return { changed: false };

    // Ensure the import binding exists.
    if (!mod.imports[entry.exportName]) {
      mod.imports.$add({ from: entry.pkgName, imported: "default", local: entry.exportName });
      this.#placeImport(mod, entry.pkgName);
    }

    // Ensure `defineConfig` import + default export shape.
    this.#ensureDefineConfig(mod);

    // Push `exportName()` onto plugins[].
    const plugins = this.#ensurePluginsArray(mod);
    plugins.push(builders.functionCall(entry.exportName));

    return { changed: true };
  }

  /**
   * Removes the `exportName()` call from `plugins[]` and, if it was the last
   * use of that local binding, removes the import too.
   */
  removePlugin(mod: ProxifiedModule, exportName: string): { changed: boolean } {
    const plugins = this.#pluginsArray(mod);
    if (!plugins) return { changed: false };

    let changed = false;
    // Iterate in reverse so splicing doesn't shift remaining indices we still
    // need to inspect.
    for (let i = plugins.length - 1; i >= 0; i--) {
      if (this.#isCallTo(plugins[i], exportName)) {
        plugins.splice(i, 1);
        changed = true;
      }
    }

    if (changed && mod.imports[exportName]) {
      delete mod.imports[exportName];
    }

    return { changed };
  }

  /** Returns the list of plugin exportNames currently in `plugins[]`. */
  listPlugins(mod: ProxifiedModule): string[] {
    const plugins = this.#pluginsArray(mod);
    if (!plugins) return [];
    const out: string[] = [];
    for (let i = 0; i < plugins.length; i++) {
      const item = plugins[i];
      const name = this.#calleeName(item);
      if (name) out.push(name);
    }
    return out;
  }

  /**
   * Locates `defineConfig({ plugins: [...] })` and returns the plugins array
   * proxy. Returns `undefined` if the config doesn't have that shape.
   */
  #pluginsArray(mod: ProxifiedModule): unknown[] | undefined {
    // biome-ignore lint/suspicious/noExplicitAny: magicast proxies are opaque
    const def = (mod.exports as any).default;
    if (!def || def.$type !== "function-call") return undefined;
    // `def.$args` is a magicast ProxifiedArray (a Proxy, not a real Array) —
    // `Array.isArray` returns false here, so guard on `.length` instead.
    const args = def.$args;
    if (!args || args.length === 0) return undefined;
    const opts = args[0];
    if (!opts || typeof opts !== "object") return undefined;
    return opts.plugins;
  }

  /**
   * Moves the import of `source`, which `imports.$add` puts first, to its
   * sorted place among the other imports, leaving those in their order: a
   * sorted file stays sorted, so `rr jsc` passes on what rr wrote.
   */
  #placeImport(mod: ProxifiedModule, source: string): void {
    const program = mod.$ast;
    if (program.type !== "Program") return;
    const { body } = program;
    const from = body.findIndex((node) => node.type === "ImportDeclaration" && node.source.value === source);
    if (from === -1) return;
    const [added] = body.splice(from, 1);
    if (!added) return;
    const before = body.findIndex(
      (node) => node.type === "ImportDeclaration" && compareImportSources(node.source.value, source) > 0,
    );
    const lastImport = body.reduce((last, node, i) => (node.type === "ImportDeclaration" ? i : last), -1);
    body.splice(before === -1 ? lastImport + 1 : before, 0, added);
  }

  #ensureDefineConfig(mod: ProxifiedModule): void {
    if (!mod.imports.defineConfig) {
      mod.imports.$add({ from: "@rrlab/cli/config", imported: "defineConfig", local: "defineConfig" });
      this.#placeImport(mod, "@rrlab/cli/config");
    }
    // biome-ignore lint/suspicious/noExplicitAny: magicast proxies are opaque
    const def = (mod.exports as any).default;
    if (!def) {
      // biome-ignore lint/suspicious/noExplicitAny: shape mutation via proxy
      (mod.exports as any).default = builders.functionCall("defineConfig", { plugins: [] });
    }
  }

  #ensurePluginsArray(mod: ProxifiedModule): unknown[] {
    // biome-ignore lint/suspicious/noExplicitAny: shape mutation via proxy
    const def = (mod.exports as any).default;
    const args = def.$args;
    if (args.length === 0) {
      args.push({ plugins: [] });
    }
    const opts = args[0];
    if (!opts.plugins) {
      opts.plugins = [];
    }
    return opts.plugins;
  }

  #isCallTo(item: unknown, exportName: string): boolean {
    return this.#calleeName(item) === exportName;
  }

  #calleeName(item: unknown): string | undefined {
    if (!item || typeof item !== "object") return undefined;
    // Magicast call expressions expose `$type === "function-call"` and a
    // `$callee` with the local identifier name.
    // biome-ignore lint/suspicious/noExplicitAny: opaque proxy
    const proxy = item as any;
    if (proxy.$type !== "function-call") return undefined;
    const callee = proxy.$callee;
    if (typeof callee === "string") return callee;
    return undefined;
  }
}

/**
 * Undoes two recast habits that formatters reject: it keeps the blank line that
 * followed an import when rr inserts another after it, and it drops the final
 * newline.
 */
function tidy(code: string): string {
  const joined = code.replace(/^(import\b[^;]*;)\n(?:[ \t]*\n)+(?=import\b)/gm, "$1\n");
  return joined.endsWith("\n") ? joined : `${joined}\n`;
}

/**
 * Biome's organizeImports order: protocol imports (`node:fs`), then packages,
 * then aliases (`#src/…`, `@/…`, `~/…`), then paths. Within a group, plain
 * code-unit order, which matches Biome for these names (`ts-plugin` before
 * `tsdown-plugin`; `localeCompare` flips them).
 */
function compareImportSources(a: string, b: string): number {
  const group = (source: string) => {
    if (/^[a-z]+:/.test(source)) return 0;
    if (/^(#|@\/|~)/.test(source)) return 2;
    if (source.startsWith(".") || source.startsWith("/")) return 3;
    return 1;
  };
  return group(a) - group(b) || (a < b ? -1 : a > b ? 1 : 0);
}

const MINIMAL_TEMPLATE = `import { defineConfig } from "@rrlab/cli/config";

export default defineConfig({
  plugins: [],
});
`;
