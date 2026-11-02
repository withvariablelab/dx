import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { dirnameOf } from "@variablelab/clibuddy";
import { describe, expect, it } from "vitest";
import { allPluginNames } from "#src/lib/plugin/directory.ts";

const HERE = dirnameOf(import.meta);
const RUN_RUN = path.resolve(HERE, "../../..");
const REPO = path.resolve(RUN_RUN, "..");

// ADRs, changesets and changelogs are point-in-time records: they keep the count they were written with.
const SKIPPED_DIRS = new Set([".git", ".turbo", "node_modules", "dist", "decisions", ".changeset"]);
const SKIPPED_FILES = new Set(["CHANGELOG.md"]);

const PLUGIN_COUNT = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:official\s+)?plugins\b/gi;
const WHATS_HERE_ROW = /^\| `([a-z0-9-]+)-plugin\/` +\|/gm;
const README_PLUGINS_ROW = /^\| `([a-z0-9-]+)` +\|/gm;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const abs = path.join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs));
    else if (entry.endsWith(".md") && !SKIPPED_FILES.has(entry)) out.push(abs);
  }
  return out;
}

function findPluginCounts(markdown: string): string[] {
  return [...markdown.matchAll(PLUGIN_COUNT)].map((match) => match[0]);
}

/** The body of the `heading` section, up to the next heading of the same level. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n${heading}\n`);
  if (start === -1) throw new Error(`No "${heading}" section: the plugin table moved or the heading was renamed.`);
  const end = markdown.indexOf("\n## ", start + heading.length + 1);
  return markdown.slice(start, end === -1 ? undefined : end);
}

function tableAliases(markdown: string, row: RegExp): string[] {
  return [...markdown.matchAll(row)].map((match) => match[1] ?? "").sort();
}

function read(relative: string): string {
  return readFileSync(path.resolve(REPO, relative), "utf8");
}

const OFFICIAL = [...allPluginNames()].sort();

describe("plugin docs", () => {
  it(`lists every official plugin in run-run/CLAUDE.md's "What's here" table`, () => {
    const aliases = tableAliases(section(read("run-run/CLAUDE.md"), "## What's here"), WHATS_HERE_ROW);
    expect(aliases, `Add a row for each plugin in PLUGINS_DIRECTORY, and only those.`).toEqual(OFFICIAL);
  });

  it(`lists every official plugin in the @rrlab/cli README's "Plugins" table`, () => {
    const aliases = tableAliases(section(read("run-run/cli/README.md"), "## Plugins"), README_PLUGINS_ROW);
    expect(aliases, `Add a row for each plugin in PLUGINS_DIRECTORY, and only those.`).toEqual(OFFICIAL);
  });

  it("no living doc counts the official plugins", () => {
    const violations: string[] = [];
    for (const file of walk(REPO)) {
      for (const count of findPluginCounts(readFileSync(file, "utf8"))) {
        violations.push(`${path.relative(REPO, file)}: "${count}"`);
      }
    }
    expect(
      violations,
      `Say "every official plugin" instead of a count; the list lives in the run-run/CLAUDE.md and @rrlab/cli README tables. Offenders: ${violations.join(", ")}`,
    ).toEqual([]);
  });

  describe("checks", () => {
    it("flags a plugin count, in digits or in words", () => {
      const markdown = "The 4 official plugins are the only consumers. Propagate to all five plugins.";
      expect(findPluginCounts(markdown)).toEqual(["4 official plugins", "five plugins"]);
    });

    it("lets prose without a count through", () => {
      const markdown = "Every official plugin compiles. Run `rr plugins add biome` to add one of the plugins.";
      expect(findPluginCounts(markdown)).toEqual([]);
    });

    it("reads aliases from the named table only, and flags a missing row", () => {
      const markdown = [
        "## Plugins",
        "",
        "| `biome`  | Biome |",
        "| `ts`     | tsc   |",
        "",
        "## Capabilities",
        "",
        "| `lint` | rr lint |",
      ].join("\n");
      const aliases = tableAliases(section(`\n${markdown}`, "## Plugins"), README_PLUGINS_ROW);
      expect(aliases).toEqual(["biome", "ts"]);
      expect(aliases).not.toEqual(OFFICIAL);
    });

    it("reads the What's here rows whether or not a formatter aligned the table", () => {
      const markdown = [
        "## What's here",
        "",
        "| Path             | Role   |",
        "| ---------------- | ------ |",
        "| `cli/`           | Kernel |",
        "| `biome-plugin/`  | Biome  |",
        "| `tsdown-plugin/` | tsdown |",
        "| `ts-plugin/` | tsc |",
      ].join("\n");
      const aliases = tableAliases(section(`\n${markdown}`, "## What's here"), WHATS_HERE_ROW);
      expect(aliases).toEqual(["biome", "ts", "tsdown"]);
    });
  });
});
