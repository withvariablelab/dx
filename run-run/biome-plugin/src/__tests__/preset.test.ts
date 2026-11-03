import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { subset } from "semver";
import { afterEach, describe, expect, it } from "vitest";

type Manifest = { peerDependencies?: Record<string, string> };
type Preset = { linter?: { rules?: object }; markdown?: object; overrides?: object[] };

const require = createRequire(import.meta.url);
const preset = require("@rrlab/biome-config") as Preset;
const readManifest = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Manifest;
const presetPkg = readManifest(path.resolve(path.dirname(require.resolve("@rrlab/biome-config")), "../package.json"));
const PLUGIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pluginPkg = readManifest(path.join(PLUGIN_DIR, "package.json"));

describe("@rrlab/biome-config, the preset that install() extends", () => {
  it("names no schema version, which Biome would compare with the installed one", () => {
    expect(preset).not.toHaveProperty("$schema");
  });

  it("leaves the recommended rules to Biome's default instead of the field Biome 2.6 deprecates", () => {
    expect(preset.linter?.rules).not.toHaveProperty("recommended");
  });

  it("parses Markdown frontmatter and leaves the code blocks inside Markdown unformatted", () => {
    expect(preset.markdown).toEqual({ parser: { frontmatter: true }, formatter: { formatEmbeds: false } });
  });

  it("loads on every Biome the plugin's peer range allows", () => {
    const pluginRange = pluginPkg.peerDependencies?.["@biomejs/biome"] ?? "*";
    const presetRange = presetPkg.peerDependencies?.["@biomejs/biome"] ?? "*";
    expect(subset(pluginRange, presetRange), `peer ${pluginRange} is wider than the preset's ${presetRange}`).toBe(true);
  });
});

describe("the files the preset keeps Biome's tools off, on the installed Biome", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("are left alone beside a repo's own files.includes, which still applies", () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "rr-biome-preset-"));
    const unformatted = {
      ts: "const a   =  1\nexport {a}\n",
      md: "#   Title\n\n*  item\n",
      yml: "a:   1\n",
      json: '{ "a":1 }\n',
    };
    const files: Record<string, string> = {
      "biome.json": '{\n  "extends": ["@rrlab/biome-config"],\n  "files": {\n    "includes": ["**", "!dist"]\n  }\n}\n',
      "src/a.ts": unformatted.ts,
      "dist/b.ts": unformatted.ts,
      "CHANGELOG.md": unformatted.md,
      "pkg/CHANGELOG.md": unformatted.md,
      ".changeset/a.md": unformatted.md,
      ".mise/locks/a.json": unformatted.json,
      ".github/workflows/pullfrog.yml": unformatted.yml,
    };
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), content);
    }
    symlinkSync(path.join(PLUGIN_DIR, "node_modules"), path.join(dir, "node_modules"), "dir");
    expect(spawnSync("git", ["init", "-q"], { cwd: dir }).status).toBe(0);

    const r = spawnSync(path.join(dir, "node_modules/.bin/biome"), ["format", "--colors=off", "."], {
      cwd: dir,
      encoding: "utf8",
    });
    const reported = [...`${r.stdout}${r.stderr}`.matchAll(/^(\S+) format\b/gm)].map((m) => m[1]);

    expect(reported).toEqual(["src/a.ts"]);
  });
});
