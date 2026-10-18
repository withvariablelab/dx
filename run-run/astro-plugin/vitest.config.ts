import { defineConfig } from "vitest/config";

// pnpm's bin shim puts its whole virtual store on NODE_PATH, which would let the
// tmp Astro projects in check.test.ts resolve packages they don't have. Dropped
// here, before the test workers fork, so they resolve like a host project does.
delete process.env.NODE_PATH;

export default defineConfig({});
