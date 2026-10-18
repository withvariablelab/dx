import * as clack from "@clack/prompts";
import type { ClackPrompts } from "#src/lib/plugin/types.ts";

/**
 * Whether a prompt can run: clack reads keys from stdin and draws on stdout,
 * so both have to be terminals. An agent, a script or CI usually has neither,
 * and a prompt there waits forever or exits on a closed stdin.
 */
export function canPrompt(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY;
}

/**
 * Adapter that exposes the subset of `@clack/prompts` matching the
 * `ClackPrompts` contract from `@rrlab/cli/plugin`. The contract intentionally
 * stays narrow (`select`, `confirm`, `isCancel`) so plugin install hooks can
 * be tested by injecting a stub without pulling in the real terminal IO.
 *
 * The casts compensate for two small type-shape mismatches:
 * - Our contract requires `label: string`; clack types `label?: string`.
 * - `clack.select` returns `Promise<unknown>` (a non-cancelled value or
 *   `symbol`); our contract narrows that to `Promise<T | symbol>`.
 *
 * Both widenings are safe: every required field is present, and clack's
 * runtime returns either the picked option's `value` (typed `T`) or
 * `clack.isCancel(...)`-detectable `symbol`.
 */
export function createClackPrompts(): ClackPrompts {
  return {
    select: <T extends string>(opts: Parameters<ClackPrompts["select"]>[0]) =>
      clack.select(opts as Parameters<typeof clack.select>[0]) as Promise<T | symbol>,
    confirm: (opts) => clack.confirm(opts),
    isCancel: (value): value is symbol => clack.isCancel(value),
  };
}
