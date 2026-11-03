import { describe, expect, it } from "vitest";
import { applyJsonEdits } from "#src/services/json-edit.ts";

describe("applyJsonEdits", () => {
  describe("op: set", () => {
    it("replaces an existing top-level key", () => {
      const out = applyJsonEdits(`{ "extends": "old" }`, [{ op: "set", path: "/extends", value: "new" }]);
      expect(JSON.parse(out)).toEqual({ extends: "new" });
    });

    it("inserts a top-level key when missing", () => {
      const out = applyJsonEdits(`{}`, [{ op: "set", path: "/extends", value: "value" }]);
      expect(JSON.parse(out)).toEqual({ extends: "value" });
    });

    it("creates nested object paths on demand", () => {
      const out = applyJsonEdits(`{}`, [{ op: "set", path: "/compilerOptions/strict", value: true }]);
      expect(JSON.parse(out)).toEqual({ compilerOptions: { strict: true } });
    });

    it("with mode=if-missing leaves an existing value untouched", () => {
      const out = applyJsonEdits(`{ "$schema": "user-pinned" }`, [
        { op: "set", path: "/$schema", value: "new", mode: "if-missing" },
      ]);
      expect(JSON.parse(out).$schema).toBe("user-pinned");
    });

    it("with mode=if-missing inserts when truly missing", () => {
      const out = applyJsonEdits(`{}`, [{ op: "set", path: "/$schema", value: "x", mode: "if-missing" }]);
      expect(JSON.parse(out).$schema).toBe("x");
    });

    it("preserves user comments when patching", () => {
      const source = `{\n  // a comment\n  "extends": "old",\n  "include": ["src"]\n}\n`;
      const out = applyJsonEdits(source, [{ op: "set", path: "/extends", value: "new" }]);
      expect(out).toContain("// a comment");
      expect(JSON.parse(out.replace(/\/\/.*/g, ""))).toEqual({ extends: "new", include: ["src"] });
    });

    it("keeps the blank lines between the user's keys", () => {
      const source = `{\n  "extends": "old",\n\n  "compilerOptions": {\n    "strict": true,\n\n    "outDir": "dist"\n  }\n}\n`;
      const out = applyJsonEdits(source, [{ op: "set", path: "/extends", value: "new" }]);
      expect(out).toBe(`{\n  "extends": "new",\n\n  "compilerOptions": {\n    "strict": true,\n\n    "outDir": "dist"\n  }\n}\n`);
    });
  });

  describe("op: unset", () => {
    it("removes an existing key", () => {
      const out = applyJsonEdits(`{ "extends": "x", "include": ["src"] }`, [{ op: "unset", path: "/extends" }]);
      expect(JSON.parse(out)).toEqual({ include: ["src"] });
    });

    it("is a no-op for a missing key", () => {
      const out = applyJsonEdits(`{ "include": ["src"] }`, [{ op: "unset", path: "/extends" }]);
      expect(JSON.parse(out)).toEqual({ include: ["src"] });
    });
  });

  describe("op: include", () => {
    it("creates the array when missing", () => {
      const out = applyJsonEdits(`{}`, [{ op: "include", path: "/extends", value: "config-a" }]);
      expect(JSON.parse(out)).toEqual({ extends: ["config-a"] });
    });

    it("appends to existing array by default (position=end)", () => {
      const out = applyJsonEdits(`{ "extends": ["a"] }`, [{ op: "include", path: "/extends", value: "b" }]);
      expect(JSON.parse(out)).toEqual({ extends: ["a", "b"] });
    });

    it("prepends with position=start", () => {
      const out = applyJsonEdits(`{ "extends": ["a"] }`, [{ op: "include", path: "/extends", value: "b", position: "start" }]);
      expect(JSON.parse(out)).toEqual({ extends: ["b", "a"] });
    });

    it("is idempotent — no duplicates", () => {
      const out = applyJsonEdits(`{ "extends": ["a", "b"] }`, [
        { op: "include", path: "/extends", value: "a", position: "start" },
      ]);
      expect(JSON.parse(out)).toEqual({ extends: ["a", "b"] });
    });
  });

  describe("op: exclude", () => {
    it("removes a value from an array", () => {
      const out = applyJsonEdits(`{ "extends": ["a", "b", "c"] }`, [{ op: "exclude", path: "/extends", value: "b" }]);
      expect(JSON.parse(out)).toEqual({ extends: ["a", "c"] });
    });

    it("is a no-op when the value is not present", () => {
      const out = applyJsonEdits(`{ "extends": ["a"] }`, [{ op: "exclude", path: "/extends", value: "missing" }]);
      expect(JSON.parse(out)).toEqual({ extends: ["a"] });
    });

    it("is a no-op when the path is missing entirely", () => {
      const out = applyJsonEdits(`{}`, [{ op: "exclude", path: "/extends", value: "x" }]);
      expect(JSON.parse(out)).toEqual({});
    });
  });

  describe("no-op edits", () => {
    it("return the source unchanged when no edit changes the document", () => {
      const source = `{\n\t// keep me\n\t"$schema": "./schema.json",\n\t"extends": ["@rrlab/biome-config", "./base.json"],\n\t"files": { "includes": ["**", "!dist"] }\n}\n`;
      const out = applyJsonEdits(source, [
        { op: "include", path: "/extends", value: "@rrlab/biome-config", position: "start" },
        { op: "set", path: "/$schema", value: "./other.json", mode: "if-missing" },
        { op: "set", path: "/files/includes", value: ["**", "!dist"], mode: "replace" },
        { op: "exclude", path: "/extends", value: "./absent.json" },
        { op: "unset", path: "/linter" },
      ]);
      expect(out).toBe(source);
    });

    it("leave an empty source empty", () => {
      expect(applyJsonEdits("", [{ op: "unset", path: "/extends" }])).toBe("");
    });
  });

  describe("composition", () => {
    it("applies a biome-config-style patch (set $schema if missing + include extends at start)", () => {
      const source = `{ "extends": ["existing"], "files": { "includes": ["**"] } }`;
      const out = applyJsonEdits(source, [
        { op: "set", path: "/$schema", value: "https://biomejs.dev/schemas/2.4.4/schema.json", mode: "if-missing" },
        { op: "include", path: "/extends", value: "@rrlab/biome-config", position: "start" },
      ]);
      const json = JSON.parse(out);
      expect(json.$schema).toBe("https://biomejs.dev/schemas/2.4.4/schema.json");
      expect(json.extends).toEqual(["@rrlab/biome-config", "existing"]);
      expect(json.files).toEqual({ includes: ["**"] });
    });
  });
});
