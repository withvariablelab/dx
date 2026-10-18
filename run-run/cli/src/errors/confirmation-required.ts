import { KnownError } from "./known-error.ts";

export class ConfirmationRequiredError extends KnownError {
  constructor(command: string) {
    super(`'${command}' asks for confirmation, and there's no terminal to ask in. Re-run it with --yes.`);
  }
}
