import * as clack from "@clack/prompts";

/**
 * Runs `fn` under a clack spinner: the message stays on success, and is
 * suffixed with `— failed` (error level) before the error re-throws. Used by
 * the interactive `plugins add/remove` flows to frame each install/uninstall
 * step.
 */
export async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
  const sp = clack.spinner();
  sp.start(message);
  try {
    const result = await fn();
    sp.stop(message);
    return result;
  } catch (err) {
    sp.error(`${message} — failed`);
    throw err;
  }
}
